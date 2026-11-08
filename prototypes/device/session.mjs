import { randomUUID } from 'node:crypto';

// Each 20 ms block is 480 signed, little-endian 16-bit samples per channel.
const FRAME_MS = 20;
const SPEAKER_BYTES = 960;
const MIC_REFERENCE_BYTES = 1920;

function isFrame(pcm, byteLength) {
  // Both block sizes are divisible by three, so canonical base64 has no padding.
  return typeof pcm === 'string' && pcm.length === byteLength / 3 * 4 &&
    !/[^A-Za-z0-9+/]/.test(pcm);
}

// One instance per authenticated, ordered connection. Async audio producers must
// hold the originating instance and turnId, even if a new socket has connected.
export class DeviceSession {
  #sessionId = randomUUID();
  #ready = false;
  #closed = false;
  #lastCapture = 0;
  #capture = null;
  #lastTurn = 0;
  #turn = null;
  #timer = null;
  #send;
  #onMicrophone;
  #onClose;
  #setTimer;
  #clearTimer;
  #ackTimeoutMs;

  constructor({ send, onMicrophone = () => {}, onClose = () => {},
    setTimer = setTimeout, clearTimer = clearTimeout, ackTimeoutMs = 5000 } = {}) {
    if (typeof send !== 'function') throw new TypeError('DeviceSession needs a send function');
    if (!Number.isSafeInteger(ackTimeoutMs) || ackTimeoutMs <= 0) {
      throw new RangeError('ackTimeoutMs must be a positive integer');
    }
    this.#send = send;
    this.#onMicrophone = onMicrophone;
    this.#onClose = onClose;
    this.#setTimer = setTimer;
    this.#clearTimer = clearTimer;
    this.#ackTimeoutMs = ackTimeoutMs;
    this.#waitFor('ready_timeout');
  }

  get sessionId() { return this.#sessionId; }
  get closed() { return this.#closed; }

  receive(message) {
    if (this.#closed) return false;
    if (!message || typeof message.type !== 'string') return this.#fail('invalid_message');
    if (!this.#ready) {
      if (message.type !== 'ready' || message.version !== 1) return this.#fail('invalid_ready');
      this.#clearDeadline();
      this.#ready = true;
      return this.#emit({ type: 'ready', version: 1 });
    }
    if (typeof message.sessionId !== 'string') return this.#fail('missing_session');
    if (message.sessionId !== this.#sessionId) return false;
    switch (message.type) {
      case 'mic':
        return this.#receiveMic(message);
      case 'played':
      case 'stopped': {
        const expected = message.type === 'played' ? 'draining' : 'canceling';
        if (this.#turn?.phase !== expected || this.#turn.id !== message.turnId) return false;
        this.#clearDeadline();
        this.#turn = null;
        return true;
      }
      default:
        return this.#fail('unknown_message');
    }
  }

  openInput() {
    if (!this.#ready || this.#closed || this.#capture) return null;
    const id = ++this.#lastCapture;
    this.#capture = { id, nextSeq: 0 };
    return this.#emit({ type: 'input.open', captureId: id }) ? id : null;
  }

  closeInput() {
    if (!this.#capture) return false;
    const id = this.#capture.id;
    this.#capture = null;
    return this.#emit({ type: 'input.close', captureId: id });
  }

  #receiveMic({ captureId, seq, pcm }) {
    if (!this.#capture || this.#capture.id !== captureId) return false;
    if (!Number.isSafeInteger(seq) || seq < 0) return this.#fail('invalid_mic_sequence');
    if (seq < this.#capture.nextSeq) return false;
    // A missing reference block invalidates the continuous input to the host AEC.
    if (seq > this.#capture.nextSeq) return this.#fail('mic_sequence_gap');
    if (!isFrame(pcm, MIC_REFERENCE_BYTES)) return this.#fail('invalid_mic_frame');
    this.#capture.nextSeq++;
    try {
      this.#onMicrophone(Buffer.from(pcm, 'base64'), seq, captureId);
      return true;
    } catch {
      return this.#fail('microphone_sink_error');
    }
  }

  startTurn() {
    if (!this.#ready || this.#closed || this.#turn) return null;
    const id = ++this.#lastTurn;
    this.#turn = { id, phase: 'speaking', nextSeq: 0 };
    return this.#emit({ type: 'turn', turnId: id }) ? id : null;
  }

  play(pcm, turnId) {
    const turn = this.#turn;
    if (!turn || turn.id !== turnId || turn.phase !== 'speaking') return false;
    if (!isFrame(pcm, SPEAKER_BYTES)) return false;
    return this.#emit({ type: 'speaker', turnId, seq: turn.nextSeq++, pcm });
  }

  endTurn(turnId) {
    const turn = this.#turn;
    if (!turn || turn.id !== turnId || turn.phase !== 'speaking') return false;
    turn.phase = 'draining';
    // A fast producer can finish while the terminal still has audio queued.
    this.#waitFor('playback_timeout', turn.nextSeq * FRAME_MS + this.#ackTimeoutMs);
    return this.#emit({ type: 'end', turnId });
  }

  cancel(turnId) {
    const turn = this.#turn;
    if (!turn || turn.id !== turnId || turn.phase === 'canceling') return false;
    turn.phase = 'canceling';
    this.#waitFor('stop_timeout');
    return this.#emit({ type: 'cancel', turnId });
  }

  close(reason = 'closed') {
    if (this.#closed) return;
    this.#closed = true;
    this.#clearDeadline();
    this.#capture = null;
    this.#turn = null;
    this.#onClose(reason);
  }

  #emit(message) {
    try {
      this.#send({ ...message, sessionId: this.#sessionId });
      return true;
    } catch {
      return this.#fail('send_error');
    }
  }

  #fail(reason) {
    this.close(reason);
    return false;
  }

  #clearDeadline() {
    if (this.#timer === null) return;
    this.#clearTimer(this.#timer);
    this.#timer = null;
  }

  #waitFor(reason, timeout = this.#ackTimeoutMs) {
    this.#clearDeadline();
    const timer = this.#setTimer(() => {
      if (this.#timer === timer) this.close(reason);
    }, timeout);
    this.#timer = timer;
  }
}
