import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFace } from '../design/eyes/example-session.mjs';
import '../design/eyes/transitions.js';

const { createTransition } = globalThis.JarvisEyeTransitions;
const { defs, modes } = globalThis.JarvisEyeArtwork;
const face = (state, mode = 'daily') => ({ state, mode });
const weights = frame => Object.fromEntries(frame.layers.map(layer => [
  layer.state + '/' + layer.mode, layer.weight,
]));

test('every approved state/mode pair can reach every other pair and settle exactly', () => {
  const faces = Object.keys(defs).flatMap(state => Object.keys(modes).map(mode => face(state, mode)));
  assert.equal(faces.length, 96);
  for (const from of faces) {
    for (const to of faces) {
      const transition = createTransition(from, 100);
      const { durationMs } = transition.setTarget(to, 100);
      assert.ok(Number.isFinite(durationMs) && durationMs >= 0);
      const middle = transition.sample(100 + durationMs / 2);
      assert.ok(Math.abs(middle.layers.reduce((sum, layer) => sum + layer.weight, 0) - 1) < 1e-12);
      const last = transition.sample(100 + durationMs);
      assert.equal(last.settled, true);
      assert.deepEqual(weights(last), { [to.state + '/' + to.mode]: 1 });
    }
  }
});

test('a new mode starts at the current mixed frame, including a reversal', () => {
  const daily = face('idle'), work = face('idle', 'work'), english = face('idle', 'english');
  const t = createTransition(daily);
  t.setTarget(work, 0);
  const half = weights(t.sample(200));
  assert.deepEqual(half, { 'idle/daily': .5, 'idle/work': .5 });
  assert.deepEqual(weights(t.setTarget(english, 200)), half);
  const third = weights(t.sample(400));
  assert.deepEqual(third, { 'idle/daily': .25, 'idle/work': .25, 'idle/english': .5 });
  assert.deepEqual(weights(t.setTarget(daily, 400)), third);
  assert.deepEqual(weights(t.sample(800)), { 'idle/daily': 1 });
});

test('facts that demand immediate feedback override an ongoing transition', () => {
  for (const [to, options] of [[face('listening'), { interrupt: true }],
    [face('off'), {}], [face('offline'), {}], [face('happy'), { reduced: true }]]) {
    const t = createTransition(face('speaking'));
    t.setTarget(face('excited', 'work'), 0);
    const frame = t.setTarget(to, 100, options);
    assert.equal(frame.durationMs, 0);
    assert.deepEqual(weights(frame), { [to.state + '/' + to.mode]: 1 });
  }
  const t = createTransition(face('speaking'));
  assert.equal(t.setTarget(face('listening'), 0).durationMs, 160);
  assert.equal(t.setTarget(face('listening'), 10, { interrupt: true }).settled, true);
});

test('duplicate events and a mode change preserve the age of the current celebration', () => {
  const t = createTransition(face('happy'), 10);
  t.setTarget(face('excited'), 20);
  const before = t.sample(200);
  assert.deepEqual(t.setTarget(face('excited'), 200), before);
  assert.equal(t.sample(340).settled, true);
  const sameEvent = t.setTarget(face('excited', 'companion'), 500);
  assert.equal(sameEvent.durationMs, 400);
  assert.equal(t.sample(900).layers.at(-1).enteredAtMs, 20);
});

test('the session example retains the current caption and rejects stale or expired attitudes', () => {
  const owner = { sessionId: 's', turnId: 2, responseId: 'r', segmentId: 1 };
  const snapshot = {
    phase: 'speaking', mode: 'english', dnd: true, jointFault: true,
    playback: { ...owner, caption: 'Good news.' },
    tone: { ...owner, id: 'happy', startedAtMs: 200, expiresAtMs: 500 },
  };
  assert.deepEqual(resolveFace(snapshot, 250), {
    state: 'happy', mode: 'english', status: '说话', caption: 'Good news.', badges: ['勿扰', '关节故障'],
  });
  assert.equal(resolveFace(snapshot, 500).state, 'speaking');
  for (const key of Object.keys(owner)) {
    const tone = { ...snapshot.tone, [key]: 'old' };
    assert.equal(resolveFace({ ...snapshot, tone }, 250).state, 'speaking');
  }
  assert.equal(resolveFace({ ...snapshot, phase: 'listening' }, 250).caption, '');
  assert.deepEqual(resolveFace({ ...snapshot, phase: 'closing' }, 250), {
    state: 'off', mode: 'english', status: '', caption: '', badges: [],
  });
});
