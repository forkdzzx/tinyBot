// Desk-bench DSP for synchronized microphone / amplifier-reference PCM, 24 kHz.
// An adaptive FIR models a linear echo path. Validate the actual K151
// paths and double talk before selecting its production echo canceller.
const ECHO_TAPS = 2400; // 100 ms at 24 kHz
const FILTER_TAPS = 33;
const HISTORY = FILTER_TAPS - 1;

function lowpassPhase(fraction) {
  const taps = Array.from({ length: FILTER_TAPS }, (_, k) => {
    const x = k - HISTORY / 2 + fraction;
    const sinc = x === 0 ? 0.60 : Math.sin(0.60 * Math.PI * x) / (Math.PI * x);
    const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / HISTORY);
    return sinc * window;
  });
  const gain = taps.reduce((sum, tap) => sum + tap, 0);
  return taps.map(tap => tap / gain);
}
const phases = [lowpassPhase(0), lowpassPhase(0.5)];

export class CaptureProcessor {
  // Mirrored reference history keeps each dot product contiguous across wrap.
  reference = new Float64Array(ECHO_TAPS * 2);
  weights = new Float64Array(ECHO_TAPS);
  cursor = 0;
  energy = 0;
  filtered = new Float64Array(HISTORY + 480);
  far = new Float64Array(ECHO_TAPS + 480);
  mic = new Float64Array(480);
  directPath = null;
  nearEnd = false;

  // Delay estimation bootstraps single-path cancellation before the adaptive
  // filter has converged. Search every possible lag but sample dot products at
  // 3 kHz; the actual cancellation below always uses full-rate samples.
  measurePath() {
    const { far, mic } = this;
    let best = 0, delay = 0, gain = 0, micPower = 0;
    for (let n = 0; n < 480; n += 8) micPower += mic[n] * mic[n];
    if (micPower < 60 * 90 ** 2) return 0;
    for (let lag = 0; lag < ECHO_TAPS; lag++) {
      let dot = 0, power = 0;
      for (let n = 0; n < 480; n += 8) {
        const sample = far[ECHO_TAPS - lag + n];
        dot += mic[n] * sample;
        power += sample * sample;
      }
      const score = dot * dot / (micPower * power + 1);
      if (power > 60 * 90 ** 2 && score > best) {
        best = score;
        delay = lag;
        gain = dot / power;
      }
    }
    // Preserve the last calibrated path during double talk. A fit to a mixed
    // block must not teach the filter that the user's voice is reference.
    if (best > 0.96) this.directPath = { delay, gain };
    return best;
  }

  process(frame) {
    if (!Buffer.isBuffer(frame) || frame.length !== 1920) throw new Error('expected 20 ms stereo PCM');
    const { reference, weights, filtered } = this;
    this.far.copyWithin(0, 480);
    let micPower = 0, cleanPower = 0, directPower = 0, refPower = 0;
    for (let i = 0; i < 480; i++) {
      const mic = this.mic[i] = frame.readInt16LE(4 * i);
      const ref = this.far[ECHO_TAPS + i] = frame.readInt16LE(4 * i + 2);
      micPower += mic * mic;
      refPower += ref * ref;
    }
    const correlation = this.energy > 0 || refPower > 0 ? this.measurePath() : 0;
    for (let i = 0; i < 480; i++) {
      const mic = this.mic[i];
      const ref = this.far[ECHO_TAPS + i];
      const pos = this.cursor = this.cursor === 0 ? ECHO_TAPS - 1 : this.cursor - 1;
      this.energy += ref * ref - reference[pos] * reference[pos];
      reference[pos] = reference[pos + ECHO_TAPS] = ref;
      let residual = mic;
      if (this.energy > 10000) {
        for (let k = 0; k < ECHO_TAPS; k++) residual -= weights[k] * reference[pos + k];
        // Normalized least-mean-squares update with regularized denominator.
        const step = 0.15 * residual / (this.energy + 100000);
        for (let k = 0; k < ECHO_TAPS; k++) weights[k] += step * reference[pos + k];
      }
      filtered[HISTORY + i] = residual;
      cleanPower += residual * residual;
      if (this.directPath) {
        const direct = mic - this.directPath.gain * this.far[ECHO_TAPS - this.directPath.delay + i];
        directPower += direct * direct;
      }
    }
    if (this.directPath && directPower < cleanPower) {
      for (let i = 0; i < 480; i++) {
        filtered[HISTORY + i] = this.mic[i] -
          this.directPath.gain * this.far[ECHO_TAPS - this.directPath.delay + i];
      }
      cleanPower = directPower;
    }
    // A conservative double-talk gate for a *playing* device. Suppress weak or
    // reference-correlated residuals, including delayed far-end-only blocks.
    this.nearEnd = cleanPower > 480 * 300 ** 2 && cleanPower > 0.06 * micPower &&
      cleanPower > 0.04 * refPower && correlation < 0.75;
    const output = Buffer.allocUnsafe(640);
    for (let i = 0; i < 320; i++) {
      const end = HISTORY + Math.floor(i * 1.5);
      const taps = phases[i % 2];
      let sum = 0;
      for (let k = 0; k < taps.length; k++) sum += filtered[end - k] * taps[k];
      output.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sum))), i * 2);
    }
    filtered.copyWithin(0, 480); // preserve the last 32 samples for the next block
    return output;
  }
}
