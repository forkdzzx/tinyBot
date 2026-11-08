// The device and the webpage share state IDs; this DOM renderer uses the UED
// source modules loaded by the page. Provider text only enters textContent.
export function attachFaceView(screen, art, caption) {
  const { defs, eyePose, faceMarkup } = globalThis.JarvisEyeArtwork;
  const { createTransition, blendPose } = globalThis.JarvisEyeTransitions;
  const label = screen.querySelector('#face-label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let target = { state: 'idle', mode: 'daily' };
  let enteredAt = performance.now();
  const transition = createTransition(target, enteredAt);
  let lastPoses, fromPoses, targetPosesAtStart;
  let raf = 0, lastPaint = 0;

  function options() {
    return { height: 540, entry: false, burst: false, still: reduced.matches,
      effects: !reduced.matches, quiet: target.state === 'waiting' };
  }

  function posesAt(time) {
    return [0, 1].map(side => eyePose(target.state, target.mode, time, time - enteredAt, side, options()));
  }

  function paint(time) {
    const frame = transition.sample(time);
    screen.dataset.transition = frame.kind;
    screen.dataset.settled = String(frame.settled);
    if (target.state === 'off') {
      art.replaceChildren();
      lastPoses = null;
      return;
    }
    const live = posesAt(time);
    lastPoses = frame.settled || !fromPoses ? live :
      live.map((pose, side) => blendPose(fromPoses[side], pose, frame.easedProgress, targetPosesAtStart[side]));
    art.innerHTML = frame.layers.map(layer => {
      if (layer.state === 'off') return '';
      const markup = faceMarkup(layer.state, layer.mode, time, time - layer.enteredAtMs,
        { ...options(), poses: lastPoses }).replace(/ id="(?:left|right)-eye"/g, '');
      return frame.settled ? markup : '<g opacity="' + layer.weight + '" class="eye-layer">' + markup + '</g>';
    }).join('');
    lastPaint = time;
  }

  function schedule() {
    if (!raf && !document.hidden && !reduced.matches && target.state !== 'off') {
      raf = requestAnimationFrame(time => {
        raf = 0;
        if (time - lastPaint >= 32) paint(time);
        schedule();
      });
    }
  }

  function update(snapshot, { interrupt = false } = {}) {
    const { state, mode } = snapshot;
    screen.dataset.state = state;
    screen.dataset.mode = mode;
    caption.textContent = snapshot.caption;
    label.textContent = state === 'off' ? '' : (defs[state].label || defs[state].name);
    screen.setAttribute('aria-label', 'Jarvis · ' + defs[state].name);
    if (state !== target.state || mode !== target.mode || interrupt) {
      const time = performance.now();
      fromPoses = lastPoses;
      transition.setTarget({ state, mode }, time, { interrupt, reduced: reduced.matches });
      if (state !== target.state) enteredAt = time;
      target = { state, mode };
      targetPosesAtStart = posesAt(time);
      paint(time);
    }
    schedule();
  }

  function resume() {
    if (document.hidden) return;
    const now = performance.now();
    if (reduced.matches) transition.setTarget(target, now, { reduced: true });
    paint(now);
    schedule();
  }
  document.addEventListener('visibilitychange', resume);
  reduced.addEventListener('change', resume);
  update({ ...target, caption: '' });
  resume();
  return update;
}
