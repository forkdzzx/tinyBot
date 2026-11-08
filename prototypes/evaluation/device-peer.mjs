import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

// A paired protocol peer, not a speaker or microphone. Tests explicitly decide
// when samples have started, drained or been stopped on their simulated device.
export async function connectSimulatedTerminal(bench) {
  const ws = new WebSocket(bench.url, {
    headers: { Authorization: `Bearer ${bench.pairingKey}` },
  });
  const messages = [];
  ws.on('message', raw => messages.push(JSON.parse(raw.toString())));
  let sessionId;
  let cursor = 0;
  const send = message => ws.send(JSON.stringify({ sessionId, ...message }));
  async function next(type, timeoutMs = 5000) {
    const end = performance.now() + timeoutMs;
    while (cursor === messages.length) {
      if (ws.readyState === WebSocket.CLOSED) throw new Error(`Device closed while waiting for ${type}`);
      if (performance.now() >= end) throw new Error(`Timed out waiting for device message ${type}`);
      await delay(3);
    }
    const message = messages[cursor++];
    assert.equal(message.type, type);
    if (sessionId) assert.equal(message.sessionId, sessionId);
    return message;
  }
  async function close() {
    if (ws.readyState === WebSocket.CLOSED) return;
    const closed = once(ws, 'close', { signal: AbortSignal.timeout(5000) });
    ws.close();
    await closed;
  }
  try {
    await once(ws, 'open', { signal: AbortSignal.timeout(5000) });
    send({ type: 'ready', version: 1 });
    const ready = await next('ready');
    sessionId = ready.sessionId;
    assert.equal(ready.version, 1);
    assert.equal(typeof sessionId, 'string');
    return { ws, sessionId, messages, send, next, close };
  } catch (error) {
    ws.terminate();
    throw error;
  }
}
