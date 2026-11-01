import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLearning} from '../prototypes/learning/extract.mjs';

const config={key:'fixture-only-key',model:'fixture-model'};
const entries=[{id:'u1',role:'user',text:'I eat breakfast every day.'},{id:'a1',role:'assistant',text:'What do you have for breakfast?'}];
const empty={vocabulary:[],corrections:[]};
const answer={vocabulary:[{word:'breakfast',meaning:'早餐',entryId:'a1',quote:'What do you have for breakfast?'}],corrections:[]};
const payload=(result=answer,extra={})=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}],usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30},...extra});
const response=value=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});

test('learning extraction sends bounded dialogue data separately from instructions and returns only whitelisted usage',async()=>{
  let request;
  const result=await extractLearning([...entries.slice(0,1),{...entries[1],privateMeta:'not sent'}],{config,fetchImpl:async(url,options)=>{
    request={url,...options};return response(payload(answer,{usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30,secret:'do not propagate',negative:-1}}));
  }});
  assert.equal(request.url,'https://ark.cn-beijing.volces.com/api/v3/chat/completions');assert.equal(request.redirect,'error');assert.equal(request.method,'POST');assert.equal(request.signal.aborted,false);
  const body=JSON.parse(request.body);assert.equal(body.model,config.model);assert.equal(body.thinking.type,'disabled');assert.equal(body.max_completion_tokens,2000);
  assert.deepEqual(JSON.parse(body.messages[1].content),{entries});assert.match(body.messages[0].content,/大小写、标点、排版不是口语错误/);assert.match(body.messages[0].content,/允许全部为空/);
  assert.deepEqual(result,{result:answer,usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30}});
});

test('empty input makes no network request and malformed or excessive input is rejected',async()=>{
  let called=0;const options={config,fetchImpl:async()=>{called++;return response(payload(empty));}};
  assert.deepEqual(await extractLearning([],options),{result:empty,usage:{}});
  for(const input of [null,[{...entries[0],role:'system'}],[entries[0],entries[0]],[{...entries[0],text:'a'.repeat(2001)}],Array.from({length:81},(_,i)=>({id:String(i),role:'user',text:'hi'})),Array.from({length:11},(_,i)=>({id:String(i),role:'user',text:'a'.repeat(2000)}))]){
    await assert.rejects(extractLearning(input,options),/^Error: learning_input_invalid$/);
  }
  assert.equal(called,0);
});

test('invalid JSON, incomplete generation and non-schema fields cannot become a learning result',async()=>{
  const invalid=[
    {choices:[{finish_reason:'length',message:{content:JSON.stringify(answer)}}]},
    {choices:[{finish_reason:'stop',message:{content:'not json'}}]},
    payload({...empty,summary:'invented progress'}),
    payload({vocabulary:[...answer.vocabulary,...answer.vocabulary,...answer.vocabulary,...answer.vocabulary],corrections:[]}),
    payload({vocabulary:[{...answer.vocabulary[0],word:'a'.repeat(81)}],corrections:[]}),
    payload({vocabulary:[],corrections:[{entryId:'u1',quote:'I eat',suggestion:'I ate'}]}),
  ];
  for(const value of invalid)await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>response(value)}),/^Error: learning_invalid_or_incomplete$/);
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>new Response('{bad')}),/^Error: learning_invalid_or_incomplete$/);
});

test('HTTP and transport failures return fixed codes without exposing response bodies or exceptions',async()=>{
  let cancelled=false;
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>({ok:false,status:429,body:{cancel:async()=>{cancelled=true;throw new Error('sensitive body');}}})}),/^Error: learning_http_429$/);assert.equal(cancelled,true);
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>{throw new Error('sensitive network headers');}}),/^Error: learning_network_or_timeout$/);
});

test('an already cancelled caller makes no request; cancellation during fetch uses the same fixed failure',async()=>{
  const early=new AbortController();early.abort();let called=false;
  await assert.rejects(extractLearning(entries,{config,signal:early.signal,fetchImpl:async()=>{called=true;}}),/^Error: learning_network_or_timeout$/);assert.equal(called,false);
  const during=new AbortController();
  const pending=extractLearning(entries,{config,signal:during.signal,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort details')),{once:true}))});
  during.abort();await assert.rejects(pending,/^Error: learning_network_or_timeout$/);
});

test('the request uses a 30-second timeout signal and expires without waiting in real time',async t=>{
  const deadline=new AbortController();let milliseconds;
  t.mock.method(AbortSignal,'timeout',ms=>{milliseconds=ms;return deadline.signal;});
  const pending=extractLearning(entries,{config,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timed out')),{once:true}))});
  assert.equal(milliseconds,30000);deadline.abort();await assert.rejects(pending,/^Error: learning_network_or_timeout$/);
});

test('cancellation also interrupts a stalled response body and cancels the reader',async()=>{
  const controller=new AbortController();let cancelled=false,startReading;
  const reading=new Promise(resolve=>{startReading=resolve;});
  const body=new ReadableStream({pull(){startReading();return new Promise(()=>{});},cancel(){cancelled=true;}});
  const pending=extractLearning(entries,{config,signal:controller.signal,fetchImpl:async()=>({ok:true,body})});
  await reading;controller.abort();await assert.rejects(pending,/^Error: learning_network_or_timeout$/);assert.equal(cancelled,true);
});

test('streaming byte budget rejects oversized bodies and cancels without parsing their text',async()=>{
  let cancelled=false;
  const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(128001));},cancel(){cancelled=true;}});
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>({ok:true,body})}),/^Error: learning_response_budget$/);assert.equal(cancelled,true);
});

test('response body failure and missing body produce fixed errors, not arbitrary source text',async()=>{
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>({ok:true,body:null})}),/^Error: learning_invalid_or_incomplete$/);
  const body=new ReadableStream({start(controller){controller.error(new Error('secret body diagnostics'));}});
  await assert.rejects(extractLearning(entries,{config,fetchImpl:async()=>({ok:true,body})}),/^Error: learning_network_or_timeout$/);
});
