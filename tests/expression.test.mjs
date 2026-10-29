import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition as step, WAKE_PHRASES } from '../prototypes/expression/state.mjs';

function listening() {
  return step(step(initialState(), {type:'button'}), {type:'wake',phrase:WAKE_PHRASES[0]});
}
test('startup requires activation; every configured wake event can enter a session', () => {
  for (const phrase of WAKE_PHRASES) {
    const boot = initialState();
    assert.equal(step(boot,{type:'wake',phrase}),boot);
    assert.equal(step(step(boot,{type:'button'}),{type:'wake',phrase}).phase,'listening');
  }
  const idle=step(initialState(),{type:'button'});
  assert.equal(step(idle,{type:'wake',phrase:'unknown'}),idle);
});
test('interrupt clears all expression and rejects late output even during next answer generation', () => {
  let state = step(listening(),{type:'submit',text:'first'});
  const old = state.turn;
  state=step(state,{type:'answer',turn:old,text:'old answer'});
  assert.equal(state.phase,'speaking');
  state=step(state,{type:'interrupt'});
  assert.equal(state.caption,'');
  assert.equal(state.motion,'none');
  state=step(state,{type:'submit',text:'second'});
  assert.equal(step(state,{type:'answer',turn:old,text:'late'}),state);
  assert.equal(step(state,{type:'finished',turn:old}),state);
  state=step(state,{type:'answer',turn:state.turn,text:'new answer'});
  assert.equal(state.caption,'new answer');
});
test('end then new session cannot resurrect an earlier reply', () => {
  let state=step(listening(),{type:'submit'});
  const old=state.turn;
  state=step(state,{type:'end'});
  state=step(state,{type:'wake',phrase:WAKE_PHRASES[1]});
  state=step(state,{type:'submit'});
  assert.equal(step(state,{type:'answer',turn:old,text:'stale'}),state);
});
test('power cycle invalidates output and returns to disabled before reactivation', () => {
  let state=listening();
  const old=state.turn;
  state=step(state,{type:'button'});
  assert.equal(state.phase,'off');
  assert.equal(step(state,{type:'answer',turn:old,text:'late'}),state);
  state=step(state,{type:'button'});
  assert.equal(state.phase,'disabled');
  assert.equal(step(state,{type:'button'}).phase,'idle');
});
