import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocketServer } from 'ws';
import { openDeviceBench } from '../device/bench-server.mjs';
import { DeviceVoiceBridge } from '../device/voice-bridge.mjs';
import { createVoiceServer } from '../voice/server.mjs';
import { connectSimulatedTerminal } from './device-peer.mjs';

async function until(check, label) {
  const deadline = performance.now() + 5000;
  while (!check()) {
    if (performance.now() >= deadline) throw new Error(`Timed out: ${label}`);
    await delay(5);
  }
}

// Two distinct near-end tones identify the scripted questions. In the second
// question both captured channels also contain a copy of the old speaker tone.
const first = { hz: 400, question: '一加一是多少？', answer: '一加一等于二。', id: 'a-first' };
const second = { hz: 900, question: '换个问题，六减二呢？', answer: '六减二等于四。', id: 'a-new' };
const blockCount = 6;
function sample(hz, index, amplitude) {
  return Math.round(amplitude * Math.sin(2 * Math.PI * hz * index / 24000));
}
function stereoBlock(hz, hasPlayback) {
  const frame = Buffer.alloc(1920);
  for (let i = 0; i < 480; i++) {
    const reference = hasPlayback ? sample(300, i, 3000) : 0;
    frame.writeInt16LE(sample(hz, i, 6500) + Math.round(reference / 2), 4 * i);
    frame.writeInt16LE(reference, 4 * i + 2);
  }
  return frame.toString('base64');
}
function speakerBlock(hz) {
  const frame = Buffer.alloc(960);
  for (let i = 0; i < 480; i++) frame.writeInt16LE(sample(hz, i, 3000), i * 2);
  return frame;
}
const oldPcm = speakerBlock(300);
const newPcm = speakerBlock(700);
async function upload(peer, captureId, startSeq, hz, hasPlayback) {
  const pcm = stereoBlock(hz, hasPlayback);
  for (let i = 0; i < blockCount; i++) {
    peer.send({ type: 'mic', captureId, seq: startSeq + i, pcm });
    await delay(20);
  }
}
function magnitude(pcm, frequency) {
  let sine = 0, cosine = 0;
  const count = pcm.length / 2;
  for (let i = 0; i < count; i++) {
    const phase = 2 * Math.PI * frequency * i / 16000;
    const value = pcm.readInt16LE(2 * i);
    sine += value * Math.sin(phase);
    cosine += value * Math.cos(phase);
  }
  return 2 * Math.hypot(sine, cosine) / count;
}
function recognize(frames) {
  assert.equal(frames.length, blockCount);
  assert.ok(frames.every(frame => frame.length === 640));
  const pcm = Buffer.concat(frames);
  const candidates = [first, second].map(phrase => ({ phrase, energy: magnitude(pcm, phrase.hz) }));
  candidates.sort((a, b) => b.energy - a.energy);
  assert.ok(candidates[0].energy > 1000 && candidates[0].energy > candidates[1].energy * 4,
    'processed 16 kHz PCM must contain the captured near-end signal');
  return candidates[0].phrase;
}

async function mockProvider() {
  const service = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(service, 'listening');
  const links = [];
  service.on('connection', ws => {
    const link = { captures: [], canceled: 0, closed: false, emit: event => ws.send(JSON.stringify(event)) };
    links.push(link);
    ws.on('message', raw => {
      const e = JSON.parse(raw);
      if (e.type === 'session.create') link.emit({ type: 'session.created' });
      if (e.type === 'input_audio_buffer.append') link.captures.push(Buffer.from(e.audio, 'base64'));
      if (e.type === 'response.cancel') {
        link.canceled++;
        // Provider can still have old events in flight around its cancel ACK.
        const late = { response_id: first.id, type: 'response.output_audio.delta', delta: oldPcm.toString('base64') };
        link.emit(late);
        link.emit({ type: 'response.canceled' });
        link.emit(late);
        link.emit({ type: 'response.output_text.done', response_id: first.id, text: '已失效的旧回答' });
      }
      if (e.type === 'session.close') link.emit({ type: 'session.closed' });
    });
    ws.on('close', () => { link.closed = true; });
  });
  return {
    endpoint: `ws://127.0.0.1:${service.address().port}`,
    links,
    async close() {
      const closed = once(service, 'close');
      for (const c of service.clients) c.terminate();
      service.close();
      await closed;
    },
  };
}
function answer(link, phrase, frame, complete) {
  const emit = fields => link.emit({ ...fields, response_id: phrase.id });
  link.emit({ type: 'conversation.item.input_audio_transcription.completed', text: phrase.question });
  emit({ type: 'response.output_text.done', text: phrase.answer });
  emit({ type: 'response.output_audio.started' });
  // Provider deltas have arbitrary chunk boundaries and may omit response_id.
  const audio = pcm => link.emit({ type: 'response.output_audio.delta', delta: pcm.toString('base64') });
  audio(frame.subarray(0, 244));
  audio(frame.subarray(244));
  audio(frame.subarray(0, 480));
  if (complete) {
    emit({ type: 'response.output_audio.done' });
    emit({ type: 'response.done' });
  }
}

const root = mkdtempSync(join(tmpdir(), 'jarvis-device-flow-'));
let provider, voice, bench, bridge;
const links = [];
function histories() {
  return readdirSync(voice.store.historyDir)
    .filter(name => name.endsWith('.json')).map(name => voice.store.readSession(name.slice(0, -5)));
}

try {
  provider = await mockProvider();
  voice = createVoiceServer({
    config: { key: 'mock-only', voice: 'mock-only' }, endpoint: provider.endpoint,
    port: 0, memoryRoot: join(root, 'data'), logRoot: join(root, 'logs'), withWake: false,
    extract: async () => ({ result: { summary: '', memories: [] } }),
    extractPractice: async () => ({ result: { vocabulary: [], corrections: [] } }),
    speak: async () => { throw new Error('unexpected host speech'); },
  });
  const voiceUrl = (await voice.start()).replace('http:', 'ws:') + '/voice';
  bench = await openDeviceBench({
    onSession(device) {
      const record = { device, faces: [], receipts: [], events: [] };
      bridge = new DeviceVoiceBridge({
        device, voiceUrl, onEvent: e => record.events.push(e.type),
        onFace: face => record.faces.push(face), onPlayback: e => record.receipts.push(e),
      });
      links.push(record);
    },
    onMicrophone: (...args) => bridge.microphone(...args),
    onPlayback: (...args) => bridge.receipt(...args),
    onDisconnect: () => bridge.close(),
  });
  const peer = await connectSimulatedTerminal(bench);
  const record = links[0];
  bridge.start();
  const { captureId } = await peer.next('input.open');
  const upstream = provider.links[0];
  await upload(peer, captureId, 0, first.hz, false);
  await until(() => upstream.captures.length >= blockCount, 'first input');
  const recognizedFirst = recognize(upstream.captures);
  assert.equal(recognizedFirst, first);
  upstream.emit({ type: 'conversation.item.input_audio_transcription.started' });
  answer(upstream, recognizedFirst, oldPcm, false);
  const oldTurn = (await peer.next('turn')).turnId;
  const oldSpeaker = await peer.next('speaker');
  assert.equal(oldSpeaker.seq, 0);
  assert.equal(oldSpeaker.turnId, oldTurn);
  assert.equal(oldSpeaker.pcm, oldPcm.toString('base64'));
  assert.ok(!record.faces.some(face => face.state === 'speaking'), 'buffering is not a playback onset');
  peer.send({ type: 'started', turnId: oldTurn });
  await until(() => record.faces.at(-1)?.state === 'speaking', 'old onscreen speaking');
  assert.equal(record.faces.at(-1).caption, first.answer);
  const interruptAt = record.faces.length;
  await upload(peer, captureId, blockCount, second.hz, true);
  await until(() => upstream.captures.length >= blockCount * 2, 'duplex input');
  const recognizedSecond = recognize(upstream.captures.slice(blockCount));
  assert.equal(recognizedSecond, second);
  assert.ok(record.events.includes('device.local_barge'), 'near-end audio stops playout before provider ASR');
  await until(() => upstream.canceled === 1, 'targeted cancel before provider ASR');
  upstream.emit({ type: 'conversation.item.input_audio_transcription.started' });
  assert.equal((await peer.next('cancel')).turnId, oldTurn);
  await until(() => upstream.canceled === 1 && record.events.includes('response.canceled'), 'upstream cancel');
  assert.ok(record.faces.slice(interruptAt).some(face => face.state === 'listening' && !face.caption));
  answer(upstream, recognizedSecond, newPcm, true);
  await until(() => record.events.includes('response.output_audio.done'), 'new answer before device stop');
  assert.equal(peer.messages.filter(m => m.type === 'turn').length, 1);
  assert.ok(!record.faces.slice(interruptAt).some(face => face.state === 'speaking'));
  peer.send({ type: 'stopped', turnId: oldTurn });

  const newTurn = (await peer.next('turn')).turnId;
  assert.notEqual(newTurn, oldTurn);
  const chunk = await peer.next('speaker');
  assert.deepEqual([chunk.turnId, chunk.seq, chunk.pcm], [newTurn, 0, newPcm.toString('base64')]);
  peer.send({ type: 'started', turnId: newTurn });
  await until(() => record.faces.at(-1)?.state === 'speaking', 'new onscreen speaking');
  assert.equal(record.faces.at(-1).caption, second.answer);
  const tail = await peer.next('speaker');
  const padded = Buffer.alloc(960);
  newPcm.copy(padded, 0, 0, 480);
  assert.deepEqual([tail.turnId, tail.seq, tail.pcm], [newTurn, 1, padded.toString('base64')]);
  assert.equal((await peer.next('end')).turnId, newTurn);
  peer.send({ type: 'played', turnId: newTurn });
  await until(() => record.faces.at(-1)?.state === 'listening', 'drained');
  assert.ok(!record.faces.slice(interruptAt).some(face => face.caption === first.answer));
  const playbackStates = record.receipts.map(e => [e.responseId, e.type]);
  assert.deepEqual(playbackStates, [[first.id, 'started'], [first.id, 'interrupted'],
    [second.id, 'started'], [second.id, 'completed']]);
  await until(() => histories()[0].entries.some(e => e.responseId === second.id && e.playback === 'completed'), 'receipt recorded');
  bridge.stop();
  await until(() => upstream.closed, 'normal session close');
  const history = histories()[0];
  assert.equal(history.endReason, 'client_end');
  assert.deepEqual(history.entries.map(e => [e.role, e.text, e.playback]), [
    ['user', first.question, undefined], ['assistant', first.answer, 'interrupted'],
    ['user', second.question, undefined], ['assistant', second.answer, 'completed'],
  ]);

  await peer.close();
  await until(() => record.device.closed, 'old device disconnected');
  const replacement = await connectSimulatedTerminal(bench);
  assert.notEqual(replacement.sessionId, peer.sessionId);
  bridge.start();
  const newCapture = await replacement.next('input.open');
  replacement.send({ type: 'mic', sessionId: peer.sessionId, captureId: newCapture.captureId, seq: 0,
    pcm: stereoBlock(first.hz, false) });
  await upload(replacement, newCapture.captureId, 0, second.hz, false);
  const reconnected = provider.links[1];
  await until(() => reconnected.captures.length >= blockCount, 'reconnected upload');
  assert.equal(recognize(reconnected.captures), second);
  // Both old and new uploads claim seq 0. Check the very first block, since
  // recognizing the dominant tone over all six would miss one stolen packet.
  const firstBlock = reconnected.captures[0];
  assert.ok(magnitude(firstBlock, second.hz) > magnitude(firstBlock, first.hz) * 4);
  assert.equal(links[1].receipts.length, 0);
  assert.ok(!links[1].faces.some(face => face.state === 'speaking' || face.caption));
  bridge.stop();
  await until(() => reconnected.closed, 'replacement session closed');
  await replacement.close();
  assert.equal(histories().length, 2);
  assert.ok(histories().every(session => session.status === 'ended'));
  console.log(JSON.stringify({
    endpoint: 'paired loopback WebSocket → /voice → local scripted provider',
    input: { source: 'two synthetic tones, interleaved microphone and reference',
      stereo24kFrames: blockCount * 3, mono16kFrames: upstream.captures.length + reconnected.captures.length,
      inputBytesPerFrame: 1920, upstreamBytesPerFrame: 640 },
    speaker: 'simulated start, stop and drain receipts', playbackStates, cloudCalls: 0,
    verified: ['active-turn captions at playback onset', 'duplex interruption',
      'new reply waits for old stop', 'late output fenced', 'partial PCM tail padded',
      'persisted playback outcomes', 'clean session end and reconnect'],
  }, null, 2));
} finally {
  bridge?.close();
  if (bench) await bench.close();
  if (voice?.server.listening) {
    const stopped = once(voice.server, 'close');
    voice.close();
    await stopped;
  }
  if (provider) await provider.close();
  rmSync(root, { recursive: true, force: true });
}
