import test from 'node:test';
import assert from 'node:assert/strict';
import {WakeChoice} from '../prototypes/voice/wake-choice.mjs';
test('standalone name waits for the complete phrase, including at the deadline',()=>{
  const c=new WakeChoice(1200),short={index:4},long={index:2};
  assert.equal(c.accept(320,null,short),null);
  assert.equal(c.accept(16000,null,null),null);
  assert.equal(c.accept(3200,long,null),long);
  assert.equal(c.accept(32000,null,null),null);
});
test('standalone name is emitted after the bounded hold and repeated hits cannot extend it',()=>{
  const c=new WakeChoice(1200),short={index:4};c.accept(320,null,short);
  assert.equal(c.accept(19199,null,short),null);
  assert.equal(c.accept(1,null,short),short);
});
test('reset drops the pending name; unrelated input and full-only phrases remain independent',()=>{
  const c=new WakeChoice(),short={index:4},full={index:3};c.accept(320,null,short);c.reset();
  assert.equal(c.accept(32000,null,null),null);assert.equal(c.accept(320,full,null),full);
});
