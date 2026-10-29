import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualSession,ToolTurnGate} from '../prototypes/voice/context-contract.mjs';
import {sessionCreate} from '../prototypes/voice/config.mjs';
const memory={id:'test',text:'测试项目复查日在周六。',source:'synthetic fixture',status:'confirmed'};
const call={call_id:'a',name:'lookup_test_schedule',arguments:'{"query":"测试活动"}'};
test('context snapshots preserve the baseline and replace old facts on update',()=>{
  const base=sessionCreate('test'),before=structuredClone(base);
  const first=contextualSession(base,{memories:[memory]});
  const next=contextualSession(base,{mode:'work',memories:[{...memory,text:'复查日为周二。'}]});
  assert.deepEqual(base,before);assert.ok(first.session.instructions.includes('周六'));
  assert.ok(next.session.instructions.includes('周二'));assert.ok(!next.session.instructions.includes('周六'));
  assert.ok(next.session.instructions.includes('"mode":"工作"'));
  assert.deepEqual(next.session.audio,base.session.audio);
});
test('context rejects unconfirmed records, missing sources and unbounded payloads',()=>{
  const base=sessionCreate('test');
  for(const options of [{mode:'invented'},{memories:[{...memory,status:'pending'}]},{memories:[{...memory,source:''}]},{memories:[{...memory,text:'x'.repeat(6001)}]}])assert.throws(()=>contextualSession(base,options));
});
test('tool completion preserves call id and accepts each ticket exactly once',()=>{
  const gate=new ToolTurnGate([call.name]);gate.nextTurn();const ticket=gate.register(call);
  assert.equal(gate.register(call),null);
  assert.deepEqual(gate.complete(ticket,{time:'14:25'}),{type:'conversation.item.create',items:[{call_id:'a',role:'tool',content:[{type:'input_text',text:'{"time":"14:25"}'}]}]});
  assert.equal(gate.complete(ticket,{}),null);
  assert.equal(gate.register(call),null);
});
test('a new turn or a closed session rejects delayed and foreign tool results',()=>{
  const gate=new ToolTurnGate([call.name]);gate.nextTurn();const old=gate.register(call);gate.nextTurn();
  assert.equal(gate.complete(old,{time:'wrong'}),null);
  assert.equal(gate.register(call),null);
  const fresh=gate.register({...call,call_id:'fresh'});assert.equal(gate.complete({...fresh},{}),null);
  gate.close();assert.equal(gate.complete(fresh,{}),null);assert.equal(gate.register({...call,call_id:'b'}),null);
});
test('tool allowlist and bounded arguments prevent arbitrary execution requests',()=>{
  const gate=new ToolTurnGate([call.name]);
  for(const item of [{...call,name:'shell'},{...call,arguments:'invalid'},{...call,arguments:'{"query":"x","command":"rm"}'},{...call,arguments:'{"query":""}'},{...call,arguments:'null'}])assert.equal(gate.register(item),null);
  const ticket=gate.register(call);assert.throws(()=>gate.complete(ticket,{text:'x'.repeat(8001)}));
});
