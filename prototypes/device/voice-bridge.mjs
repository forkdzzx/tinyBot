import WebSocket from 'ws';
import { SessionLifecycle } from '../voice/lifecycle.mjs';
import { VoicePresentation } from '../voice/presentation.mjs';
import { CaptureProcessor } from './audio.mjs';

const FRAME_BYTES = 960;
const MAX_QUEUED_AUDIO = 4 * 1024 * 1024;
const AUDIO_DELTA = 'response.output_audio.delta';

function visibleEvent(e) {
  // Pass only the UI contract. In particular no audio bytes, model context or credentials.
  const out = { type: e.type };
  for (const key of ['response_id', 'id', 'name', 'message', 'status', 'revision', 'autoLocked']) {
    if (e[key] !== undefined) out[key] = e[key];
  }
  if (e.type.startsWith('response.output_text.') || e.type.startsWith('conversation.item.input_audio_transcription.')) {
    for (const key of ['text', 'transcript', 'delta']) if (typeof e[key] === 'string') out[key] = e[key];
  }
  return out;
}

// One bridge belongs to one authenticated device connection. Network events
// arriving after its /voice socket was replaced cannot affect the new chat.
export class DeviceVoiceBridge {
  constructor({ device, voiceUrl, onEvent = () => {}, onPlayback = () => {}, onFace = () => {} }) {
    const url = new URL(voiceUrl);
    if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || url.pathname !== '/voice' ||
        url.username || url.password || url.search || url.hash) throw new Error('expected loopback /voice URL');
    this.device = device;
    this.url = url;
    this.onEvent = onEvent;
    this.onPlayback = onPlayback;
    this.onFace = onFace;
    this.socket = null;
    this.active = null;
    this.queue = [];
    this.retired = new Set();
    this.input = null;
    this.queuedBytes = 0;
    this.lifecycle = new SessionLifecycle(() => this.stop());
  }

  start() {
    if (this.socket || this.active || !this.device.ready) return false;
    this.ending = false;
    this.speechFrames = 0;
    this.suppressOutput = false;
    this.retired.clear();
    this.face = new VoicePresentation(this.onFace);
    this.face.setPhase('connecting');
    const ws = this.socket = new WebSocket(this.url, {
      origin: 'http://' + this.url.host, handshakeTimeout: 5000, maxPayload: MAX_QUEUED_AUDIO,
    });
    ws.on('open', () => {
      if (this.socket !== ws || this.ending) return;
      this.send({ type: 'start', mode: 'manual', clientBuild: 'device-voice-v1' });
      this.heartbeat = setInterval(() => this.send({ type: 'heartbeat' }), 10000);
    });
    ws.on('message', data => {
      if (this.socket !== ws) return;
      try { this.voiceEvent(JSON.parse(data.toString())); }
      catch { this.fail('设备语音协议或播放缓存异常'); }
    });
    ws.on('error', () => {
      if (this.socket === ws && !this.ending) this.fail('本地语音连接失败');
    });
    ws.on('close', () => {
      if (this.socket !== ws) return;
      if (!this.ending) this.onEvent({ type: 'local.error', message: '本地语音连接已断开' });
      this.release();
    });
    this.deadline = setTimeout(() => this.fail('设备语音启动超时'), 20000);
    return true;
  }

  send(event) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(event));
    return true;
  }

  microphone(buffer, seq, captureId) {
    if (this.ending || captureId !== this.input || !this.processor || !this.socket) return;
    if (this.socket.bufferedAmount > 64000) return this.fail('设备收音发送积压');
    const frame = this.processor.process(buffer);
    this.send({ type: 'audio', audio: frame.toString('base64') });
    const playing = this.active?.started && this.active.awaiting !== 'stopped';
    this.speechFrames = playing && this.processor.nearEnd ? this.speechFrames + 1 : 0;
    if (this.speechFrames >= 4) {
      // Cancel local playout even if upstream generation has already finished.
      // Keep this capture open so ASR hears the whole replacement question.
      const generating = this.queue.findLast(reply => !reply.done);
      this.cancelOutput();
      this.speechFrames = 0;
      this.face.interrupt();
      this.lifecycle.interrupted();
      this.onEvent({ type: 'device.local_barge' });
      if (generating) this.send({ type: 'interrupt', response_id: generating.id });
    }
  }

  voiceEvent(e) {
    if (e.type === 'local.closed') {
      this.onEvent(visibleEvent(e));
      this.release();
      return;
    }
    if (this.ending) return;
    if (e.type.startsWith('response.output_') &&
        (this.suppressOutput || this.lifecycle.phase === 'waiting' || this.retired.has(e.response_id))) return;
    if (e.type !== AUDIO_DELTA) {
      const visible = visibleEvent(e);
      this.face.accept(visible);
      this.onEvent(visible);
    }
    switch (e.type) {
      case 'local.ready':
        clearTimeout(this.deadline);
        if (this.input !== null) break;
        this.processor = new CaptureProcessor();
        this.input = this.device.openInput();
        if (this.input === null) return this.fail('设备收音尚未就绪');
        this.lifecycle.ready();
        this.send({ type: 'unmute' });
        break;
      case 'local.user_started':
        this.cancelOutput();
        this.suppressOutput = false;
        this.lifecycle.userStarted();
        break;
      case 'local.interrupted':
        this.cancelOutput();
        this.suppressOutput = true;
        this.lifecycle.interrupted();
        break;
      case 'response.canceled':
        this.suppressOutput = false;
        break;
      case 'local.waiting':
        this.cancelOutput();
        this.lifecycle.inputCompleted('等一下，我想想');
        break;
      case 'local.memory_result':
      case 'local.memory_speech_failed':
        this.cancelOutput();
        this.suppressOutput = false;
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.lifecycle.inputCompleted(e.transcript || e.text || '');
        break;
      case 'response.output_audio.started':
        if (!e.response_id) throw new Error('missing response ID');
        if (this.queue.some(reply => reply.id === e.response_id)) break;
        if (this.queue.length >= 16) throw new Error('too many queued replies');
        this.stream = { id: e.response_id, frames: [], tail: Buffer.alloc(0), done: false };
        this.queue.push(this.stream);
        break;
      case AUDIO_DELTA:
      case 'response.output_audio.done': {
        const reply = e.response_id ? this.queue.find(item => item.id === e.response_id) : this.stream;
        if (!reply || reply.done) break;
        if (e.type === AUDIO_DELTA) this.append(reply, e.delta);
        else {
          reply.done = true;
          if (reply.tail.length) {
            const frame = Buffer.alloc(FRAME_BYTES);
            reply.tail.copy(frame);
            this.queuedBytes += FRAME_BYTES - reply.tail.length;
            reply.frames.push(frame);
            reply.tail = Buffer.alloc(0);
          }
        }
        this.pump();
        break;
      }
      case 'local.end':
      case 'local.error':
        this.stop();
        break;
    }
  }

  append(reply, delta) {
    if (typeof delta !== 'string' || delta.length % 4 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(delta)) throw new Error('invalid PCM encoding');
    const data = Buffer.from(delta, 'base64');
    if (data.length % 2 || this.queuedBytes + data.length > MAX_QUEUED_AUDIO) throw new Error('invalid PCM block');
    this.queuedBytes += data.length;
    const block = reply.tail.length ? Buffer.concat([reply.tail, data]) : data;
    let i = 0;
    while (i + FRAME_BYTES <= block.length) {
      reply.frames.push(block.subarray(i, i + FRAME_BYTES));
      i += FRAME_BYTES;
    }
    reply.tail = Buffer.from(block.subarray(i));
  }

  pump() {
    if (this.ending || this.timer || this.active?.awaiting) return;
    const reply = this.queue[0];
    if (!reply) return;
    if (reply.frames.length) {
      if (!this.active) {
        const turnId = this.device.startTurn();
        if (turnId == null) return this.fail('无法启动设备播放');
        this.active = { id: reply.id, turnId };
      }
      const frame = reply.frames.shift();
      this.queuedBytes -= frame.length;
      if (!this.device.play(frame.toString('base64'), this.active.turnId)) return this.fail('设备播放失败');
      // Keep the socket cancelable even when the provider delivers minutes of audio at once.
      this.timer = setTimeout(() => { this.timer = null; this.pump(); }, 20);
    } else if (reply.done) {
      if (this.active) {
        this.active.awaiting = 'played';
        if (!this.device.endTurn(this.active.turnId)) this.fail('设备播完请求失败');
      } else {
        this.retired.add(reply.id);
        this.queue.shift();
        this.pump();
      }
    }
  }

  cancelOutput() {
    this.speechFrames = 0;
    clearTimeout(this.timer);
    this.timer = null;
    for (const reply of this.queue) this.retired.add(reply.id);
    this.queue = [];
    this.queuedBytes = 0;
    this.stream = null;
    if (this.active && this.active.awaiting !== 'stopped') {
      this.active.awaiting = 'stopped';
      this.device.cancel(this.active.turnId);
    }
  }

  // Called only after DeviceSession verifies connection, turn and receipt state.
  receipt(kind, turnId) {
    const active = this.active;
    if (!active || active.turnId !== turnId) return;
    const status = { started: 'started', played: 'completed', stopped: 'interrupted' }[kind];
    if (!status) return;
    if (kind === 'started') {
      active.started = true;
      this.face?.onset(active.id);
      this.lifecycle.outputStarted();
    } else {
      this.active = null;
      if (kind === 'played') {
        this.face?.ended(active.id);
        this.lifecycle.playbackEnded();
        this.retired.add(active.id);
        this.queue.shift();
      }
    }
    this.send({ type: 'playback', response_id: active.id, state: status });
    this.onPlayback({ type: status, responseId: active.id, turnId, sessionId: this.device.sessionId });
    if (kind !== 'started') this.pump();
  }

  stop() {
    if (!this.socket || this.ending) return;
    this.ending = true;
    this.clearCapture();
    this.cancelOutput();
    this.lifecycle.dispose();
    this.face?.dispose();
    clearTimeout(this.deadline);
    if (this.socket.readyState !== WebSocket.OPEN) return this.release();
    this.send({ type: 'stop' });
    this.deadline = setTimeout(() => this.release(), 3000);
  }

  clearCapture() {
    if (this.input !== null) this.device.closeInput();
    this.input = null;
    this.processor = null;
  }

  release() {
    this.ending = true;
    clearTimeout(this.deadline);
    clearInterval(this.heartbeat);
    const old = this.socket;
    this.socket = null;
    this.clearCapture();
    this.cancelOutput();
    this.lifecycle.dispose();
    this.face?.dispose();
    if (old && old.readyState !== WebSocket.CLOSED) old.terminate();
  }

  fail(message) {
    this.onEvent({ type: 'local.error', message });
    this.stop();
  }

  close() {
    this.release();
    this.device.close('bridge_closed');
    this.active = null;
  }
}
