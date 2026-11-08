// K151 bench: a loopback WebSocket peer stands in for the firmware and speaker.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { openDeviceBench } from '../device/bench-server.mjs';

const sessions = [];
const captured = [];
const passed = [];
const bench = await openDeviceBench({
  onSession: session => sessions.push(session),
  onMicrophone: (buffer, seq, captureId) => captured.push({ buffer, seq, captureId }),
  ackTimeoutMs: 1500,
});
const headers = { Authorization: `Bearer ${bench.pairingKey}` };
const event = (socket, type) => once(socket, type, { signal: AbortSignal.timeout(5000) });
async function until(check, label) {
  const end = performance.now() + 5000;
  while (!check()) {
    if (performance.now() >= end) throw new Error(`device bench timed out: ${label}`);
    await delay(5);
  }
}
async function rejected(url, options, status) {
  const client = new WebSocket(url, options);
  await assert.rejects(event(client, 'open'), new RegExp(`Unexpected server response: ${status}$`));
}
async function paired() {
  const ws = new WebSocket(bench.url, { headers });
  const inbox = [];
  ws.on('message', data => inbox.push(JSON.parse(data.toString())));
  const send = message => ws.send(JSON.stringify(message));
  async function next(type) {
    await until(() => inbox.length > 0, type);
    const message = inbox.shift();
    assert.equal(message.type, type);
    return message;
  }
  await event(ws, 'open');
  send({ type: 'ready', version: 1 });
  const { sessionId, version } = await next('ready');
  assert.equal(version, 1);
  assert.ok(sessionId);
  return { ws, next, send, sessionId, host: sessions.at(-1) };
}

const stereo = Buffer.alloc(1920);
for (let sample = 0; sample < 480; sample++) {
  stereo.writeInt16LE(sample, sample * 4);
  stereo.writeInt16LE(-sample, sample * 4 + 2);
}
const capturePcm = stereo.toString('base64');
const speakerPcm = Buffer.alloc(960, 17).toString('base64');

try {
  await rejected(bench.url, {}, 401);
  await rejected(bench.url, { headers: { Authorization: 'Bearer ' + '0'.repeat(64) } }, 401);
  await rejected(bench.url, { headers, origin: 'http://localhost' }, 403);
  await rejected(bench.url.replace('/device/v1', '/voice'), { headers }, 404);
  assert.equal(sessions.length, 0);
  passed.push('设备入口拒绝缺少或错误的配对凭证、网页来源和 /voice 路径');

  const first = await paired();
  const { host, next, send, sessionId } = first;
  await rejected(bench.url, { headers }, 409);
  assert.equal(sessions.length, 1);
  send({ type: 'mic', sessionId, captureId: 1, seq: 0, pcm: Buffer.alloc(1920).toString('base64') });
  // A round trip on the ordered WebSocket makes the pre-open input check deterministic.
  const pong = event(first.ws, 'pong');
  first.ws.ping();
  await pong;
  assert.equal(captured.length, 0);
  const captureId = host.openInput();
  assert.deepEqual(await next('input.open'), { type: 'input.open', sessionId, captureId });
  const mic = { type: 'mic', sessionId, captureId, pcm: capturePcm };
  const oldTurn = host.startTurn();
  assert.deepEqual(await next('turn'), { type: 'turn', sessionId, turnId: oldTurn });
  assert.ok(host.play(speakerPcm, oldTurn));
  assert.deepEqual(await next('speaker'), { type: 'speaker', sessionId, turnId: oldTurn, seq: 0, pcm: speakerPcm });
  send({ ...mic, seq: 0 });
  send({ ...mic, seq: 0 }); // duplicate
  send({ ...mic, seq: 1 });
  await until(() => captured.length >= 2, 'mic while speaking');
  assert.deepEqual(captured, [0, 1].map(seq => ({ buffer: stereo, seq, captureId })));
  passed.push('只接受一个已配对端；模拟播放期间保留两路采样的顺序和字节，重复帧只交付一次');

  assert.ok(host.cancel(oldTurn));
  assert.deepEqual(await next('cancel'), { type: 'cancel', sessionId, turnId: oldTurn });
  send({ type: 'stopped', sessionId, turnId: oldTurn + 1 }); // incorrect receipt
  send({ ...mic, seq: 2 });
  await until(() => captured.length === 3, 'mic after cancel');
  assert.equal(host.startTurn(), null);
  send({ type: 'stopped', sessionId, turnId: oldTurn });
  send({ ...mic, seq: 3 }); // ordered after the simulated stop receipt
  await until(() => captured.length === 4, 'stop receipt');
  const newTurn = host.startTurn();
  assert.notEqual(newTurn, oldTurn);
  assert.deepEqual(await next('turn'), { type: 'turn', sessionId, turnId: newTurn });
  assert.equal(host.play(speakerPcm, oldTurn), false);
  assert.ok(host.play(speakerPcm, newTurn));
  assert.equal((await next('speaker')).turnId, newTurn);
  assert.ok(host.endTurn(newTurn));
  assert.deepEqual(await next('end'), { type: 'end', sessionId, turnId: newTurn });
  send({ type: 'played', sessionId, turnId: newTurn });
  send({ ...mic, seq: 4 });
  await until(() => captured.length === 5, 'playback receipt');
  passed.push('错误停播回执无法放行下一答；正确回执后可播新答，旧回答的迟到音频被丢弃');

  assert.ok(host.closeInput());
  assert.equal((await next('input.close')).captureId, captureId);
  const reopened = host.openInput();
  assert.equal((await next('input.open')).captureId, reopened);
  assert.notEqual(reopened, captureId);
  send({ ...mic, seq: 5 });
  send({ ...mic, captureId: reopened, seq: 0 });
  await until(() => captured.length >= 6, 'reopened capture');
  assert.deepEqual(captured.slice(5), [{ buffer: stereo, seq: 0, captureId: reopened }]);
  const interrupted = host.startTurn();
  assert.equal((await next('turn')).turnId, interrupted);
  assert.ok(host.play(speakerPcm, interrupted));
  await next('speaker');
  const disconnected = event(first.ws, 'close');
  first.ws.terminate(); // loss of transport while the answer is in flight
  await disconnected;
  // The host also observes the disconnect before the next connection takes its place.
  await until(() => host.closed, 'old link closed');
  assert.equal(host.play(speakerPcm, interrupted), false);
  const second = await paired();
  assert.notEqual(second.sessionId, sessionId);
  const currentCapture = second.host.openInput();
  await second.next('input.open');
  second.send({ ...mic, captureId: currentCapture, seq: 0, pcm: Buffer.alloc(1920).toString('base64') });
  second.send({ ...mic, captureId: currentCapture, sessionId: second.sessionId, seq: 0 });
  await until(() => captured.length >= 7, 'reconnected microphone');
  assert.deepEqual(captured.slice(6), [{ buffer: stereo, seq: 0, captureId: currentCapture }]);
  const secondTurn = second.host.startTurn();
  const turnMessage = await second.next('turn');
  assert.equal(turnMessage.sessionId, second.sessionId);
  assert.equal(turnMessage.turnId, secondTurn);
  assert.ok(second.host.cancel(secondTurn));
  await second.next('cancel');
  second.send({ type: 'stopped', sessionId, turnId: secondTurn });
  const [code, reason] = await event(second.ws, 'close');
  assert.equal(code, 1008);
  assert.equal(reason.toString(), 'stop_timeout');
  assert.equal(second.host.startTurn(), null);
  passed.push('重开收音与断线重连分别隔离旧采样；旧连接的停播回执无效，超时关闭设备链路');
  console.log(JSON.stringify({ device: 'simulated K151', transport: 'loopback WebSocket', cloudCalls: 0, passed }, null, 2));
} finally {
  await bench.close();
}
