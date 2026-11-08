// One reducer per authenticated voice connection. The transport disposes it on
// disconnect. A response's text may arrive before its first sample is rendered.
const modes = new Set(['daily', 'work', 'companion', 'english']);
const phases = new Set(['idle', 'connecting', 'listening', 'thinking', 'speaking',
  'sleepy', 'waiting', 'offline', 'off']);

export class VoicePresentation {
  #snapshot = { state: 'idle', mode: 'daily', caption: '', responseId: null };
  #responses = new Map();
  #retired = new Set();
  #audioOrder = 0;
  #lastOnset = 0;
  #disposed = false;
  #change;

  constructor(onChange = () => {}) { this.#change = onChange; }
  get snapshot() { return { ...this.#snapshot }; }

  #publish(update, interrupt = false) {
    if (this.#disposed) return;
    const old = this.#snapshot;
    const next = { ...old, ...update };
    if (!interrupt && Object.keys(update).every(key => old[key] === next[key])) return;
    this.#snapshot = next;
    this.#change(this.snapshot, { interrupt });
  }

  #resetAnswers() {
    for (const id of this.#responses.keys()) this.#retired.add(id);
    this.#responses.clear();
  }

  setPhase(state) {
    if (!phases.has(state) || this.#disposed) return;
    if (['off', 'idle', 'waiting', 'offline'].includes(state)) this.#resetAnswers();
    this.#publish({ state, caption: '', responseId: null });
  }

  interrupt() {
    this.#resetAnswers();
    this.#publish({ state: 'listening', caption: '', responseId: null }, true);
  }

  dispose() {
    this.setPhase('idle');
    this.#disposed = true;
    this.#responses.clear();
    this.#retired.clear();
  }

  accept(e) {
    if (this.#disposed) return;
    switch (e.type) {
      case 'local.mode_state':
        if (modes.has(e.id)) this.#publish({ mode: e.id });
        return;
      case 'local.ready': return this.setPhase('listening');
      case 'local.interrupted':
      case 'local.user_started': return this.interrupt();
      case 'local.memory_result':
        this.#resetAnswers();
        return this.setPhase('thinking');
      case 'local.memory_speech_failed': return this.interrupt();
      case 'local.waiting': return this.setPhase('waiting');
      case 'local.end':
      case 'local.closed': return this.setPhase('idle');
      case 'conversation.item.input_audio_transcription.delta':
        if (this.#snapshot.state === 'listening') this.#publish({ caption: e.delta || e.text || '' });
        return;
      case 'conversation.item.input_audio_transcription.completed':
        if (this.#snapshot.state === 'listening') {
          this.#publish({ state: 'thinking', caption: e.transcript || e.text || this.#snapshot.caption });
        }
        return;
      case 'response.output_text.delta':
      case 'response.output_text.done':
      case 'response.output_audio.started': {
        const id = e.response_id;
        if (!id || this.#retired.has(id) || this.#snapshot.state === 'waiting') return;
        const entry = this.#responses.get(id) ?? { order: 0, text: '' };
        if (e.type === 'response.output_audio.started') entry.order ||= ++this.#audioOrder;
        else if (e.type === 'response.output_text.done') entry.text = e.text || entry.text;
        else entry.text += e.delta || e.text || '';
        this.#responses.set(id, entry);
        if (id === this.#snapshot.responseId) this.#publish({ caption: entry.text });
        return;
      }
    }
  }

  // Call from the output audio clock (or a device playback-start receipt).
  onset(id) {
    const entry = this.#responses.get(id);
    if (!entry?.order || entry.order < this.#lastOnset) return;
    this.#lastOnset = entry.order;
    this.#publish({ state: 'speaking', caption: entry.text, responseId: id });
  }

  ended(id) {
    if (!this.#responses.delete(id)) return;
    this.#retired.add(id);
    if (id === this.#snapshot.responseId) this.setPhase('listening');
  }
}
