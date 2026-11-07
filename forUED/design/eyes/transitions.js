/* Portable transition sampler. All times are monotonic milliseconds.
 * Load as a classic browser script or import for its effect in a JS runtime.
 * Rendering, clocks, accessibility settings and business events belong to the host.
 */
(() => {
  'use strict';

  const interaction = ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking'];
  const emotions = new Set([
    'happy', 'excited', 'laughing', 'love', 'encouraging', 'curious', 'puzzled',
    'surprised', 'empathetic', 'teasing', 'proud', 'determined',
  ]);
  const supportedStates = new Set([...interaction, ...emotions, 'sleepy', 'waiting', 'dnd', 'offline', 'fault', 'off']);
  const supportedModes = new Set(['daily', 'work', 'companion', 'english']);
  const duration = Object.freeze({
    idle: 0, blackout: 0, interrupt: 0, instant: 0, device: 0, wake: 260,
    quiet: 180, focus: 160, mode: 400, emotion: 320, state: 240,
  });

  function assertFace(face) {
    if (!supportedStates.has(face?.state) || !supportedModes.has(face?.mode)) {
      throw new RangeError('Unknown Jarvis eye state or mode');
    }
  }

  function assertTime(time) {
    if (!Number.isFinite(time)) throw new RangeError('Expected a finite monotonic time in milliseconds');
  }

  function classify(from, to, options = {}) {
    if (to.state === 'off') return 'blackout';
    if (options.interrupt) return 'interrupt';
    if (options.reduced || options.immediate) return 'instant';

    const stateChanged = from.state !== to.state;
    if (stateChanged) {
      if (to.state === 'offline' || to.state === 'fault') return 'device';
      if (from.state === 'off') return 'wake';
      if (to.state === 'waiting' || to.state === 'dnd') return 'quiet';
      if (to.state === 'listening') return 'focus';
    }
    if (from.mode !== to.mode) return 'mode';
    if (!stateChanged) return 'idle';
    if (emotions.has(from.state) || emotions.has(to.state)) return 'emotion';
    return 'state';
  }

  function eased(kind, u) {
    if (kind === 'focus') return 1 - (1 - u) ** 3;
    if (kind === 'mode') return u ** 3 * (u * (6 * u - 15) + 10);
    return u * u * (3 - 2 * u);
  }

  function sameFace(a, b) {
    return a.state === b.state && a.mode === b.mode;
  }

  function createTransition(initial, nowMs = 0) {
    assertFace(initial);
    assertTime(nowMs);
    let target = {state: initial.state, mode: initial.mode};
    let targetEntry = nowMs;
    let start = nowMs;
    let sources = [];
    let kind = 'idle';
    let durationMs = 0;

    function sample(time) {
      assertTime(time);
      const progress = durationMs ? Math.min(1, Math.max(0, (time - start) / durationMs)) : 1;
      const easedProgress = eased(kind, progress);
      let foundTarget = false;
      const layers = [];

      // Each distinct source appears once, even after A -> B -> A. Snapshot weights
      // before replacing the target, so rapid retargeting has no pending queue.
      for (const source of sources) {
        const weight = source.weight * (1 - easedProgress);
        if (sameFace(source, target)) {
          foundTarget = true;
          layers.push({...target, enteredAtMs: targetEntry, weight: weight + easedProgress});
        } else if (weight > 0) {
          layers.push({...source, weight});
        }
      }
      if (!foundTarget && easedProgress > 0) {
        layers.push({...target, enteredAtMs: targetEntry, weight: easedProgress});
      }
      return {
        target: {...target}, layers, kind, durationMs, progress, easedProgress,
        settled: progress === 1,
      };
    }

    function setTarget(next, time, options = {}) {
      assertFace(next);
      assertTime(time);
      if (time < start) throw new RangeError('Transition time cannot go backwards');
      const policy = classify(target, next, options);
      const forced = ['blackout', 'interrupt', 'instant'].includes(policy);
      if (sameFace(next, target) && !forced) return sample(time);
      const scale = options.durationScale ?? 1;
      if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Expected a positive durationScale');
      const frame = sample(time);
      const continuing = frame.layers.find(layer => sameFace(layer, next));
      if (next.state !== target.state) targetEntry = continuing?.enteredAtMs ?? time;
      target = {state: next.state, mode: next.mode};
      start = time;
      kind = policy;
      durationMs = duration[policy] * scale;
      sources = durationMs ? frame.layers : [];
      return sample(time);
    }

    return Object.freeze({setTarget, sample});
  }

  // A moving ring may cross 180 degrees during a transition. Use the target's
  // orientation at the start to pick its short arc, then retain ongoing motion.
  function blendPose(from, to, amount, targetAtStart = to) {
    const mix = key => from[key] + (to[key] - from[key]) * amount;
    const startDelta = ((targetAtStart.rot - from.rot + 180) % 360 + 360) % 360 - 180;
    return {
      x: mix('x'), y: mix('y'), sx: mix('sx'), sy: mix('sy'),
      rot: from.rot + (startDelta + to.rot - targetAtStart.rot) * amount,
    };
  }

  globalThis.JarvisEyeTransitions = Object.freeze({createTransition, classify, blendPose, duration});
})();
