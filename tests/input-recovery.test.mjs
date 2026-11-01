import test from 'node:test';
import assert from 'node:assert/strict';
import {InputRecovery,INPUT_STALL_MS,INPUT_COMMIT_MS} from '../prototypes/voice/input-recovery.mjs';
function fixture(){let now=0,id=0;const tasks=new Map(),events=[];
  const clock={setTimeout(fn,ms){tasks.set(++id,{at:now+ms,fn});return id;},clearTimeout(id){tasks.delete(id);}};
  const watch=new InputRecovery({clock,stalled:s=>events.push(['stalled',s]),commit:s=>events.push(['commit',s]),expired:s=>events.push(['expired',s])});
  const advance=ms=>{now+=ms;for(const [id,t] of [...tasks])if(t.at<=now){tasks.delete(id);t.fn();}};
  return {watch,events,advance};
}
test('stalled partial shows a notice but never finalizes automatically',()=>{const {watch,events,advance}=fixture();watch.started();watch.progress('对对，请保存吧');advance(INPUT_STALL_MS);assert.deepEqual(events.map(e=>e[0]),['stalled']);advance(120000);assert.deepEqual(events.map(e=>e[0]),['stalled']);});
test('duplicate punctuation does not hide a stall, while new words restart detection',()=>{const {watch,events,advance}=fixture();watch.started();watch.progress('对对');advance(5000);watch.progress('对对。');advance(1000);assert.equal(events.length,1);watch.progress('对对，请保存吧');assert.equal(watch.snapshot().stalled,false);advance(5999);assert.equal(events.length,1);advance(1);assert.equal(events.length,2);});
test('manual finish is scoped, single-use and times out even if partial updates continue',()=>{const {watch,events,advance}=fixture();watch.started();assert.equal(watch.finish(1),false);advance(INPUT_STALL_MS);assert.equal(watch.finish(0),false);assert.equal(watch.finish(1),true);assert.equal(watch.finish(1),false);watch.progress('changed');advance(INPUT_COMMIT_MS);assert.deepEqual(events.map(e=>e[0]),['stalled','commit','expired']);assert.equal(watch.active,false);});
test('final result cancels recovery and a delayed click cannot finalize the next utterance',()=>{const {watch,events,advance}=fixture();watch.started();advance(INPUT_STALL_MS);watch.finish(1);watch.complete();advance(INPUT_COMMIT_MS);assert.equal(events.length,2);watch.started();advance(INPUT_STALL_MS);assert.equal(watch.finish(1),false);assert.equal(watch.finish(2),true);});
test('new input and session close invalidate the old warning and timeout',()=>{const {watch,events,advance}=fixture();watch.started();advance(INPUT_STALL_MS);watch.finish(1);watch.started();advance(INPUT_STALL_MS);assert.ok(!events.some(e=>e[0]==='expired'));watch.close();advance(20000);assert.ok(!events.some(e=>e[0]==='expired'));});
