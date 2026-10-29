import test from 'node:test';
import assert from 'node:assert/strict';
import {TextConversation} from '../prototypes/evaluation/ark.mjs';
const event=item=>`data: ${JSON.stringify(item)}\r\n\r\n`;
const delta=content=>({model:'test',choices:[{index:0,delta:{content},finish_reason:null}]});
const stop={choices:[{index:0,delta:{},finish_reason:'stop'}]};
function response(text){
  const bytes=new TextEncoder().encode(text);let i=0;
  return new Response(new ReadableStream({pull(controller){if(i===bytes.length)controller.close();else controller.enqueue(bytes.slice(i,i+=1));}}));
}
test('SSE survives UTF-8 and CRLF fragmentation, ignores role chunk, keeps final usage',async()=>{
  const raw=': keepalive\r\n\r\n'+event({choices:[{delta:{role:'assistant'}}]})+event(delta('你好'))+event(delta('。下一句。'))+event(stop)+event({choices:[],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16,prompt_tokens_details:{cached_tokens:7}}})+'data: [DONE]\r\n\r\n';
  let body;
  const c=new TextConversation({key:'test',model:'test',instructions:'fixed',fetchImpl:async(_,init)=>{body=JSON.parse(init.body);return response(raw);}});
  const r=await c.turn('hello',{stream:true});assert.equal(r.answer,'你好。下一句。');assert.equal(r.firstSentence,'你好。');
  assert.ok(r.firstTextMs<=r.firstSentenceMs);assert.ok(r.firstSentenceMs<=r.fullResponseMs);assert.equal(r.usage.cached_tokens,7);
  assert.equal(body.stream,true);assert.deepEqual(body.stream_options,{include_usage:true});assert.equal(c.history.length,3);
});
test('incomplete, truncated, malformed and provider-error streams never enter history',async()=>{
  const streams=[event(delta('partial'))+event(stop),event(delta('partial'))+event({choices:[{finish_reason:'length'}]})+'data: [DONE]\n\n','data: nope\n\n',event({error:{message:'secret detail'}})+'data: [DONE]\n\n',event(stop)+'data: [DONE]\n\n'];
  for(const raw of streams){
    const c=new TextConversation({key:'test',model:'test',instructions:'fixed',fetchImpl:async()=>response(raw)});
    await assert.rejects(()=>c.turn('question',{stream:true}),e=>/Ark stream/.test(e.message)&&!e.message.includes('secret'));assert.equal(c.history.length,1);
  }
});
test('no punctuation leaves sentence metric null, and failed stream can recover',async()=>{
  let failed=true;const c=new TextConversation({key:'test',model:'test',instructions:'fixed',fetchImpl:async()=>response(failed?'data: bad\n\n':event(delta('Short answer'))+event(stop)+'data: [DONE]\n\n')});
  await assert.rejects(()=>c.turn('failed',{stream:true}));failed=false;
  const r=await c.turn('new',{stream:true});assert.equal(r.firstSentenceMs,null);assert.equal(r.firstSentence,null);
  assert.deepEqual(c.history.map(x=>x.content),['fixed','new','Short answer']);
});
