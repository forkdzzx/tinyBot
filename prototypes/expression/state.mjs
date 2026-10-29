// P1 event simulation only: no microphone, model, motor, or OS power control.
export const WAKE_PHRASES = Object.freeze([
  'Hi Jarvis', 'Jarvis, you up?', 'Jarvis, are you there?',
  'Wake up. Daddy’s home.', 'Jarvis!',
]);

export function initialState() {
  return { phase: 'disabled', turn: 0, caption: '', motion: 'none' };
}

const active = new Set(['listening', 'thinking', 'speaking']);

export function transition(state, event) {
  if (event.type === 'button') {
    const phase = state.phase === 'off' ? 'disabled'
      : state.phase === 'disabled' ? 'idle' : 'off';
    return { phase, turn: state.turn + 1, caption: '', motion: 'none' };
  }
  if (event.type === 'wake' && state.phase === 'idle'
      && WAKE_PHRASES.includes(event.phrase)) {
    return { ...state, phase: 'listening', turn: state.turn + 1 };
  }
  if (!active.has(state.phase)) return state;
  if (event.type === 'interrupt') {
    // Invalidates ALL output from the previous turn, including late results.
    return { phase: 'listening', turn: state.turn + 1, caption: '', motion: 'none' };
  }
  if (event.type === 'end') {
    return { phase: 'idle', turn: state.turn + 1, caption: '', motion: 'none' };
  }
  if (event.type === 'submit' && state.phase === 'listening') {
    return { ...state, phase: 'thinking', caption: event.text || '', motion: 'none' };
  }
  if (event.type === 'answer' && state.phase === 'thinking'
      && event.turn === state.turn) {
    return { ...state, phase: 'speaking', caption: event.text, motion: 'nod' };
  }
  if (event.type === 'finished' && state.phase === 'speaking'
      && event.turn === state.turn) {
    return { ...state, phase: 'listening', caption: '', motion: 'none' };
  }
  return state;
}
