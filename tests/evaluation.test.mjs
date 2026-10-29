import test from 'node:test';
import assert from 'node:assert/strict';
import {TextConversation} from '../prototypes/evaluation/ark.mjs';
import {pcm16Frame} from '../prototypes/evaluation/seeduplex.mjs';

const ok=answer=>new Response(JSON.stringify({model:'test-model',choices:[{finish_reason:'stop',message:{content:answer}}],usage:{prompt_tokens:10,completion_tokens:3,total_tokens:13}}));
test('text comparison sends latest ASR and explicit history, isolated per conversation',async()=>{
  const calls=[];
  const options={key:'test-key',model:'test-model',instructions:'frozen',fetchImpl:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return ok(calls.length===1?'I am Jarvis.':'I said I am Jarvis.');}};
  const a=new TextConversation(options);
  await a.turn("What's your name");await a.turn("What's your last answer");
  assert.deepEqual(calls[1].body.messages.map(m=>m.content),['frozen',"What's your name",'I am Jarvis.',"What's your last answer"]);
  assert.equal(calls[0].url,'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
  assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].body.thinking.type,'disabled');
  const copy=a.history;copy[0].content='changed';assert.equal(a.history[0].content,'frozen');
  const b=new TextConversation(options);await b.turn('Hello');assert.equal(calls[2].body.messages.length,2);
});
test('failed, truncated and malformed responses do not pollute conversation history',async()=>{
  for(const fetchImpl of [async()=>new Response('secret provider detail',{status:403}),async()=>new Response('bad json'),async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'partial'}}]})),async()=>{throw new Error('secret network detail');}]){
    let fail=true;const c=new TextConversation({key:'test',model:'test',instructions:'fixed',fetchImpl:(...args)=>fail?fetchImpl(...args):ok('recovered')});
    await assert.rejects(()=>c.turn('failed question'),error=>!error.message.includes('secret'));
    assert.equal(c.history.length,1);fail=false;await c.turn('new question');assert.deepEqual(c.history.map(m=>m.content),['fixed','new question','recovered']);
  }
});
test('overlapping evaluation turns cannot reorder explicit history',async()=>{
  let release;const c=new TextConversation({key:'test',model:'test',instructions:'fixed',fetchImpl:()=>new Promise(resolve=>{release=resolve;})});
  const first=c.turn('one');await assert.rejects(()=>c.turn('two'),/Concurrent/);release(ok('first'));await first;assert.equal(c.history.length,3);
});
test('24k PCM becomes consecutive 20ms 16k frames with zero padding',()=>{
  const input=Buffer.alloc(960*2);for(let i=0;i<960;i++)input.writeInt16LE(i*2,i*2);
  const first=pcm16Frame(input,0),second=pcm16Frame(input,1),end=pcm16Frame(input,2);
  assert.equal(first.length,640);assert.equal(first.readInt16LE(2),3);assert.equal(first.readInt16LE(638),957);assert.equal(second.readInt16LE(0),960);assert.deepEqual(end,Buffer.alloc(640));
});
