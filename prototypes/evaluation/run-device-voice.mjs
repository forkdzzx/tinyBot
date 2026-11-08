// Opt-in live test. Only the two fixed, synthesized test questions reach the
// speech service. All PCM stays in memory; history is isolated from runtime/data.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openDeviceBench } from '../device/bench-server.mjs';
import { DeviceVoiceBridge } from '../device/voice-bridge.mjs';
import { ENDPOINT, loadConfig, sessionCreate } from '../voice/config.mjs';
import { createVoiceServer } from '../voice/server.mjs';
import { connectSimulatedTerminal } from './device-peer.mjs';
import { synthesize } from './seeduplex.mjs';

const config = loadConfig();
const questions = ['请给我介绍一下太阳系的八颗行星，每一颗用一句话。', '换个问题，一加一等于几？请只说答案。'];
mkdirSync('runtime/evals', { recursive: true, mode: 0o700 });
const root = mkdtempSync('runtime/evals/device-voice-live-');
const report = { questions, transcripts: [], answers: [], receipts: [], faces: [], inputFrames: 0, outcome: 'incomplete' };
let app, bench, bridge, peer, oscillator, failure;
const began = performance.now();
const ms = () => Math.round(performance.now() - began);
async function waitFor(check, label, timeout = 45000) {
  const end = performance.now() + timeout;
  while (!check()) {
    if (failure) throw failure;
    if (performance.now() >= end) throw new Error(label);
    await delay(20);
  }
}

try {
  const clips = [];
  for (const question of questions) {
    const { pcm } = await synthesize(config.key, { endpoint: ENDPOINT, request: sessionCreate(config.voice) }, question);
    clips.push(pcm);
  }
  app = createVoiceServer({
    config, port: 0, withWake: false, memoryRoot: join(root, 'data'), logRoot: join(root, 'logs'),
    extract: async () => ({ result: { memories: [], summary: '' } }),
    extractPractice: async () => ({ result: { vocabulary: [], corrections: [] } }),
  });
  const origin = await app.start();
  bench = await openDeviceBench({
    onSession(device) {
      bridge = new DeviceVoiceBridge({
        device, voiceUrl: origin.replace('http:', 'ws:') + '/voice',
        onEvent(e) {
          if (e.type === 'conversation.item.input_audio_transcription.completed') report.transcripts.push(e.transcript || e.text);
          if (e.type === 'response.output_text.done') report.answers.push({ id: e.response_id, text: e.text });
          if (e.type === 'local.error') failure = new Error('voice_service_failed');
        },
        onPlayback(e) { report.receipts.push({ ms: ms(), type: e.type, turn: e.turnId, responseId: e.responseId }); },
        onFace(face) {
          const last = report.faces.at(-1);
          if (face.state !== last?.state || face.responseId !== last?.responseId) {
            report.faces.push({ ms: ms(), state: face.state, responseId: face.responseId });
          }
        },
      });
    },
    onMicrophone: (...args) => bridge.microphone(...args),
    onPlayback: (...args) => bridge.receipt(...args),
    onDisconnect: () => bridge?.close(),
  });
  peer = await connectSimulatedTerminal(bench);
  let captureId, seq = 0, activeTurn, firstTurn, ending = false, playedFrames = 0;
  const silence = Buffer.alloc(960);
  let queue = [], clip = 0, offset = 0, previousReference = silence;
  let beganSecond = false;
  peer.ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'input.open': captureId = msg.captureId; break;
        case 'input.close': captureId = null; break;
        case 'turn':
          assert.equal(activeTurn, undefined);
          activeTurn = msg.turnId; firstTurn ??= activeTurn;
          playedFrames = 0; ending = false;
          break;
        case 'speaker':
          assert.equal(msg.turnId, activeTurn);
          assert.equal(msg.seq, playedFrames + queue.length);
          queue.push(Buffer.from(msg.pcm, 'base64'));
          break;
        case 'cancel':
          assert.equal(msg.turnId, activeTurn);
          activeTurn = undefined; ending = false; queue = [];
          if (msg.turnId === firstTurn) report.virtualStopMs = ms();
          peer.send({ type: 'stopped', turnId: msg.turnId });
          break;
        case 'end': assert.equal(msg.turnId, activeTurn); ending = true; break;
      }
    } catch (error) { failure = error; }
  });
  bridge.start();
  // A virtual 24-kHz terminal clock. Channel 2 is the sample played on this
  // tick; channel 1 also receives a 20-ms-delayed, attenuated copy as echo.
  oscillator = setInterval(() => {
    if (!captureId || failure) return;
    try {
      const reference = queue.shift();
      if (reference) {
        if (!playedFrames) peer.send({ type: 'started', turnId: activeTurn });
        playedFrames++;
      } else if (ending) {
        peer.send({ type: 'played', turnId: activeTurn });
        ending = false; activeTurn = undefined;
      }
      if (activeTurn === firstTurn && playedFrames >= 12 && !beganSecond) {
        beganSecond = true; clip = 1; offset = 0;
        report.secondInputDuringPlaybackMs = ms();
      }
      const block = Buffer.alloc(1920);
      let nearEnergy = 0;
      for (let i = 0; i < 480; i++) {
        const near = seq < 15 || offset >= clips[clip].length ? 0 : clips[clip].readInt16LE(offset);
        nearEnergy += near * near;
        if (seq >= 15 && offset < clips[clip].length) offset += 2;
        const mixed = Math.round(near + previousReference.readInt16LE(i * 2) * 0.16);
        block.writeInt16LE(Math.max(-32768, Math.min(32767, mixed)), i * 4);
        block.writeInt16LE(reference?.readInt16LE(i * 2) ?? 0, i * 4 + 2);
      }
      if (clip === 1 && nearEnergy / 480 > 256 ** 2) report.secondSignalMs ??= ms();
      previousReference = reference ?? silence;
      peer.send({ type: 'mic', captureId, seq: seq++, pcm: block.toString('base64') });
      report.inputFrames++;
    } catch (error) { failure = error; }
  }, 20);
  await waitFor(() => report.receipts.some(e => e.type === 'completed' && e.turn !== firstTurn), 'missing_second_playback', 65000);
  assert.ok(beganSecond);
  assert.ok(report.receipts.some(e => e.type === 'interrupted' && e.turn === firstTurn), 'missing_old_stop');
  const completed = report.receipts.find(e => e.type === 'completed' && e.turn !== firstTurn);
  assert.match(report.answers.find(a => a.id === completed.responseId)?.text ?? '', /^(?:答案是|等于|是)?\s*[二两2][。！!\s]*$/, 'new question unanswered');
  assert.ok(report.faces.some(f => f.state === 'speaking' && f.responseId === completed.responseId), 'new answer face missing');
  assert.equal(report.transcripts.length, 2, 'unexpected number of ASR turns');
  assert.match(report.transcripts[1], /1\s*[+加]\s*1|一加一/u, 'unexpected second transcript');
  assert.doesNotMatch(report.transcripts[1], /行星|水星|金星|太阳|地球|陨石|轨道|公转/u, 'previous answer leaked into new transcript');
  report.signalToVirtualStopMs = report.virtualStopMs - report.secondSignalMs;
  assert.ok(report.signalToVirtualStopMs >= 0 && report.signalToVirtualStopMs <= 1000, 'virtual speaker missed stop target');
  report.outcome = 'passed';
} catch (error) {
  report.outcome = 'failed';
  report.error = error.message;
  process.exitCode = 1;
} finally {
  clearInterval(oscillator);
  bridge?.stop();
  if (app?.store && report.inputFrames) {
    // Let the normal stop path persist the final receipt before closing the peer.
    await delay(400);
  }
  await peer?.close();
  await bench?.close();
  app?.close();
  writeFileSync(join(root, 'result.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ outcome: report.outcome, report: join(root, 'result.json') }));
}
