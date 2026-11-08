import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureProcessor } from '../prototypes/device/audio.mjs';

const BLOCK = 480;
function captured(sample, phase, count = 1) {
  const frames = [];
  for (let b = 0; b < count; b++) {
    const frame = Buffer.alloc(1920);
    for (let n = 0; n < BLOCK; n++) {
      const [mic, ref] = sample(phase + BLOCK * b + n);
      frame.writeInt16LE(Math.round(mic), 4 * n);
      frame.writeInt16LE(Math.round(ref), 4 * n + 2);
    }
    frames.push(frame);
  }
  return frames;
}

function energy(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) sum += buffer.readInt16LE(i) ** 2;
  return sum / (buffer.length / 2);
}

test('24 kHz mic/reference stays continuous across blocks and rejects a 10 kHz alias', () => {
  const levels = [];
  for (const hz of [1000, 10000]) {
    const capture = new CaptureProcessor();
    const wave = t => 10000 * Math.sin(2 * Math.PI * hz * t / 24000);
    const [a, b] = captured(t => [wave(t), 0], 0, 2);
    const first = capture.process(a), second = capture.process(b);
    assert.equal(first.length, 640);
    assert.equal(second.length, 640);
    levels.push(energy(second));
    if (hz === 1000) {
      // Known 16-source-sample FIR latency; no per-frame phase resets.
      for (let i = 0; i < 320; i++) {
        assert.ok(Math.abs(second.readInt16LE(i * 2) - wave(480 + 1.5 * i - 16)) < 65);
      }
    }
    assert.throws(() => capture.process(Buffer.alloc(638)));
  }
  assert.ok(levels[1] < levels[0] * 0.001);
});

test('linear multipath echo at 3, 14 and 30.5 ms falls after adaptation and double talk survives', () => {
  let seed = 155;
  const reference = Array.from({ length: 480 * 235 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.round((seed / 2**32 - 0.5) * 13000);
  });
  const near = t => t < 480 * 225 ? 0 : Math.round(5000 * Math.sin(2 * Math.PI * 700 * t / 24000));
  const make = (t, withReference) => [
    near(t) + 0.52 * (reference[t - 72] ?? 0) + 0.18 * (reference[t - 336] ?? 0) - 0.09 * (reference[t - 732] ?? 0),
    withReference ? reference[t] : 0,
  ];
  const clean = new CaptureProcessor(), noRef = new CaptureProcessor(), nearOnly = new CaptureProcessor();
  let residual = 0, raw = 0, xy = 0, xx = 0, yy = 0;
  for (let i = 0; i < 235; i++) {
    const out = clean.process(captured(t => make(t, true), i * BLOCK)[0]);
    const baseline = noRef.process(captured(t => make(t, false), i * BLOCK)[0]);
    const wanted = nearOnly.process(captured(t => [near(t), 0], i * BLOCK)[0]);
    if (i >= 205 && i < 225) {
      residual += energy(out);
      raw += energy(baseline);
      assert.equal(clean.nearEnd, false, 'far-end echo alone should not interrupt');
    }
    if (i >= 226) {
      assert.equal(clean.nearEnd, true);
      for (let j = 0; j < 640; j += 2) {
        const x = out.readInt16LE(j), y = wanted.readInt16LE(j);
        xy += x * y;
        xx += x * x;
        yy += y * y;
      }
    }
  }
  assert.ok(raw > 0 && residual < raw * 0.01);
  assert.ok(xy / Math.sqrt(xx * yy) > 0.85);
});

test('the double-talk detector distinguishes silence, a 20 ms delayed reference and concurrent speech', () => {
  const processor = new CaptureProcessor();
  const far = t => t < 480 * 4 ? 0 : 9400 * Math.sin(2 * Math.PI * (320 * t / 24000 + 0.00000007 * t * t));
  for (let i = 0; i < 28; i++) {
    const near = i < 20 ? 0 : 3900;
    const block = captured(t => [
      0.16 * far(t - 480) + near * Math.sin(t * 2 * Math.PI * 808 / 24000),
      far(t),
    ], i * 480)[0];
    processor.process(block);
    assert.equal(processor.nearEnd, i >= 20);
  }
});
