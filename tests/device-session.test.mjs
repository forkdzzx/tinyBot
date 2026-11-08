import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceSession } from '../prototypes/device/session.mjs';

const speaker = Buffer.alloc(960, 4).toString('base64');
const stereo = Buffer.alloc(1920);
for (let i = 0; i < 480; i++) {
  stereo.writeInt16LE(i, i * 4);
  stereo.writeInt16LE(-i, i * 4 + 2);
}
const mic = stereo.toString('base64');

function fixture(overrides) {
  const sent = [], captured = [], closed = [], timers = new Set();
  const device = new DeviceSession({
    send: message => sent.push(message),
    onMicrophone: (...args) => captured.push(args),
    onClose: reason => closed.push(reason),
    setTimer(fn, delay) { const timer = { fn, delay }; timers.add(timer); return timer; },
    clearTimer: timer => timers.delete(timer),
    ...overrides,
  });
  function receive(message) { return device.receive({ sessionId: device.sessionId, ...message }); }
  function ready() { return device.receive({ type: 'ready', version: 1 }); }
  function frame(captureId, seq, pcm = mic) { return receive({ type: 'mic', captureId, seq, pcm }); }
  function timeout() { assert.equal(timers.size, 1); [...timers][0].fn(); }
  return { device, receive, ready, frame, timeout, sent, captured, closed, timers };
}

test('authenticated connection requires versioned ready and a separate input open', () => {
  const f = fixture();
  assert.equal(f.device.openInput(), null);
  assert.equal(f.device.startTurn(), null);
  assert.equal(f.ready(), true);
  assert.deepEqual(f.sent, [{ type: 'ready', version: 1, sessionId: f.device.sessionId }]);
  assert.equal(f.timers.size, 0);
  assert.equal(f.frame(1, 0), false);
  assert.deepEqual(f.captured, []);
  for (const first of [null, { type: 'mic', seq: 0 }, { type: 'ready', version: 2 }]) {
    const bad = fixture();
    assert.equal(bad.device.receive(first), false);
    assert.equal(bad.closed.length, 1);
    assert.equal(bad.ready(), false);
  }
});

test('capture keeps mic and reference interleaved and fences duplicate and prior-capture data', () => {
  const f = fixture();
  f.ready();
  const first = f.device.openInput();
  assert.equal(first, 1);
  assert.equal(f.device.openInput(), null);
  assert.equal(f.frame(first, 0), true);
  assert.equal(f.frame(first, 0), false);
  assert.equal(f.device.closeInput(), true);
  assert.equal(f.frame(first, 1), false);
  const second = f.device.openInput();
  assert.equal(second, 2);
  assert.equal(f.frame(first, 1), false);
  assert.equal(f.frame(second, 0), true);
  assert.deepEqual(f.captured, [[stereo, 0, first], [stereo, 0, second]]);
  assert.deepEqual(f.sent.slice(1), [
    { type: 'input.open', captureId: first, sessionId: f.device.sessionId },
    { type: 'input.close', captureId: first, sessionId: f.device.sessionId },
    { type: 'input.open', captureId: second, sessionId: f.device.sessionId },
  ]);
});

test('a discontinuity or malformed stereo block fails the current capture closed', () => {
  for (const [seq, pcm, reason] of [
    [1, mic, 'mic_sequence_gap'], [-1, mic, 'invalid_mic_sequence'],
    [0, speaker, 'invalid_mic_frame'], [0, mic.slice(1) + '=', 'invalid_mic_frame'],
  ]) {
    const f = fixture();
    f.ready();
    const id = f.device.openInput();
    assert.equal(f.frame(id, seq, pcm), false);
    assert.deepEqual(f.closed, [reason]);
    assert.equal(f.frame(id, 0), false);
    assert.deepEqual(f.captured, []);
  }
});

test('drain requires matching played receipt; late old audio and receipts cannot affect next turn', () => {
  const f = fixture();
  f.ready();
  const old = f.device.startTurn();
  assert.equal(f.device.play(mic, old), false);
  assert.equal(f.device.play(speaker, old), true);
  assert.equal(f.device.play(speaker, old), true);
  assert.equal(f.receive({ type: 'played', turnId: old }), false);
  assert.equal(f.device.endTurn(old), true);
  assert.equal(f.device.play(speaker, old), false);
  assert.equal(f.device.startTurn(), null);
  assert.equal(f.receive({ type: 'stopped', turnId: old }), false);
  assert.equal(f.receive({ type: 'played', turnId: old }), true);
  const next = f.device.startTurn();
  assert.notEqual(next, old);
  assert.equal(f.device.play(speaker, old), false);
  assert.equal(f.device.play(speaker), false);
  assert.equal(f.device.cancel(old), false);
  assert.equal(f.receive({ type: 'played', turnId: old }), false);
  assert.equal(f.device.play(speaker, next), true);
  assert.deepEqual(f.sent.filter(m => m.type === 'speaker').map(m => [m.turnId, m.seq]),
    [[old, 0], [old, 1], [next, 0]]);
  assert.deepEqual(f.closed, []);
});

test('barge-in supersedes an in-flight drain, waits for stopped, keeps receiving duplex mic', () => {
  const f = fixture();
  f.ready();
  const input = f.device.openInput();
  const turn = f.device.startTurn();
  f.device.play(speaker, turn);
  f.device.endTurn(turn);
  const drainTimer = [...f.timers][0];
  assert.equal(f.device.cancel(turn), true);
  assert.equal(f.device.cancel(turn), false);
  assert.equal(f.receive({ type: 'played', turnId: turn }), false);
  assert.equal(f.receive({ type: 'stopped', turnId: turn + 1 }), false);
  assert.equal(f.device.startTurn(), null);
  assert.equal(f.device.play(speaker, turn), false);
  drainTimer.fn();
  assert.equal(f.frame(input, 0), true);
  assert.equal(f.receive({ type: 'stopped', turnId: turn }), true);
  assert.equal(f.timers.size, 0);
  assert.equal(f.device.startTurn(), turn + 1);
  assert.deepEqual(f.closed, []);
});

test('missing ready, cancel or drain receipts close once and never silently advance playback', () => {
  for (const [expected, delay] of [['ready_timeout', 5000], ['stop_timeout', 5000], ['playback_timeout', 5020]]) {
    const f = fixture();
    if (expected !== 'ready_timeout') {
      f.ready();
      const turn = f.device.startTurn();
      f.device.play(speaker, turn);
      if (expected === 'stop_timeout') f.device.cancel(turn);
      else f.device.endTurn(turn);
    }
    assert.equal([...f.timers][0].delay, delay);
    f.timeout();
    f.device.close();
    assert.deepEqual(f.closed, [expected]);
    assert.equal(f.timers.size, 0);
    assert.equal(f.device.startTurn(), null);
  }
});

test('disconnect invalidates old producers and reconnect rejects previous connection receipts and mic', () => {
  const a = fixture(), b = fixture();
  a.ready();
  a.device.openInput();
  const turnA = a.device.startTurn();
  a.device.close();
  b.ready();
  assert.notEqual(a.device.sessionId, b.device.sessionId);
  const input = b.device.openInput();
  const turnB = b.device.startTurn();
  b.device.cancel(turnB);
  assert.equal(a.device.play(speaker, turnA), false);
  const sessionId = a.device.sessionId;
  assert.equal(b.receive({ type: 'stopped', sessionId, turnId: turnA }), false);
  assert.equal(b.receive({ type: 'mic', sessionId, captureId: input, seq: 0, pcm: mic }), false);
  assert.equal(b.frame(input, 0), true);
  assert.equal(b.device.startTurn(), null);
  assert.equal(b.receive({ type: 'stopped', turnId: turnB }), true);
});

test('transport send failure and input sink failure dispose the connection', () => {
  const a = fixture({ send() { throw Error('disconnected'); } });
  assert.equal(a.ready(), false);
  assert.deepEqual(a.closed, ['send_error']);
  const b = fixture({ onMicrophone() { throw Error('sink unavailable'); } });
  b.ready();
  assert.equal(b.frame(b.device.openInput(), 0), false);
  assert.deepEqual(b.closed, ['microphone_sink_error']);
});
