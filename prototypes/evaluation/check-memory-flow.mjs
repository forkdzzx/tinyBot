import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket,{WebSocketServer} from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
const root=mkdtempSync(join(tmpdir(),'jarvis-memory-flow-'));
let remote,seq=0,holdSpeech=false,held,ttsFailure=false;
const emit=e=>remote.send(JSON.stringify(e));
const providerReply=()=>{
  const id='untrusted-'+seq;
  for(const e of [{type:'response.output_audio.started'},{type:'response.output_text.done',text:'已经保存了错误的内容'},{type:'response.output_audio.delta',delta:Buffer.alloc(960).toString('base64')},{type:'response.output_audio.done'},{type:'response.done'}])emit({...e,response_id:id});
};
const upstream=new WebSocketServer({host:'127.0.0.1',port:8797});
upstream.on('connection',ws=>{remote=ws;ws.on('message',raw=>{
  const e=JSON.parse(raw);
  if(e.type==='session.create')emit({type:'session.created'});
  if(e.type==='session.close')emit({type:'session.closed'});
  if(e.type==='response.cancel')emit({type:'response.canceled'});
  if(e.type==='conversation.item.create'&&e.items?.some(i=>i.role==='tool'))providerReply();
});});
const speak=async args=>{
  if(ttsFailure)throw new Error('injected_speech_failure');
  const finish=()=>{args.onEvent({type:'response.output_audio.started',response_id:args.responseId});args.onEvent({type:'response.output_audio.delta',response_id:args.responseId,delta:Buffer.alloc(960).toString('base64')});args.onEvent({type:'response.output_audio.done',response_id:args.responseId});};
  if(holdSpeech)await new Promise(resolve=>{held=()=>{finish();resolve();};});else finish();
};
const app=createVoiceServer({config:{key:'test',voice:'test'},endpoint:'ws://127.0.0.1:8797',port:8796,memoryRoot:root,withWake:false,extract:async()=>({result:{summary:'',memories:[]}}),speak});
let ws;const events=[];
async function wait(check){for(let i=0;i<300;i++){if(check())return;await delay(10);}throw new Error('integration_deadline');}
async function input(text,args){
  const from=events.length;seq++;
  emit({type:'conversation.item.input_audio_transcription.started'});emit({type:'conversation.item.input_audio_transcription.completed',text});
  if(args){providerReply();emit({type:'response.function_call_arguments.done',items:[{name:'remember_user_fact',call_id:'call-'+seq,arguments:JSON.stringify(args)}]});}
  else providerReply();
  return from;
}
async function completed(from){
  await wait(()=>events.slice(from).some(e=>e.type==='response.output_audio.done'));
  const e=events.slice(from).find(e=>e.type==='response.output_audio.done');ws.send(JSON.stringify({type:'playback',response_id:e.response_id,state:'completed'}));await delay(20);
  return events.slice(from).find(e=>e.type==='local.memory_result');
}
const args=quote=>({key:'preference.drink',layer:'profile',quote});
try{
  await app.start();ws=new WebSocket('ws://127.0.0.1:8796/voice',{origin:'http://127.0.0.1:8796'});ws.on('message',raw=>events.push(JSON.parse(raw)));
  await wait(()=>ws.readyState===WebSocket.OPEN);ws.send(JSON.stringify({type:'start',mode:'manual'}));await wait(()=>events.some(e=>e.type==='local.ready'));
  let from=await input('请记住，我最喜欢红茶',args('我最喜欢红茶'));assert.equal((await completed(from)).status,'saved');
  from=await input('请记住，我现在最喜欢绿茶',args('我现在最喜欢绿茶'));assert.equal((await completed(from)).status,'confirmation_required');
  from=await input('是的，按新的计');assert.equal((await completed(from)).status,'saved');assert.equal(app.store.search('喝什么').memories[0].text,'我现在最喜欢绿茶');
  const original=app.store.write;app.store.write=(p,v)=>{if(p.endsWith('memory.json'))throw new Error('disk');original(p,v);};
  from=await input('请记住，我喜欢吃苹果',{key:'preference.food',layer:'profile',quote:'我喜欢吃苹果'});assert.equal((await completed(from)).status,'failed');app.store.write=original;
  assert.ok(!events.some(e=>e.text==='已经保存了错误的内容'||e.response_id?.startsWith('untrusted-')));
  holdSpeech=true;from=await input('请记住，我喜欢吃香蕉',{key:'preference.food',layer:'profile',quote:'我喜欢吃香蕉'});await wait(()=>held);
  const beforeInterrupt=events.length;await input('说个笑话');await wait(()=>events.slice(beforeInterrupt).some(e=>e.type==='local.user_started'));held();await delay(30);
  assert.ok(!events.slice(beforeInterrupt).some(e=>e.type.startsWith('response.output_audio')&&e.response_id?.startsWith('memory-')));holdSpeech=false;
  held=null;holdSpeech=true;from=await input('请记住，我喜欢吃梨',{key:'preference.food',layer:'profile',quote:'我喜欢吃梨'});await wait(()=>held);
  const beforeButton=events.length;ws.send(JSON.stringify({type:'interrupt'}));await delay(30);held();await delay(30);
  assert.ok(!events.slice(beforeButton).some(e=>e.type.startsWith('response.output_audio')&&e.response_id?.startsWith('memory-')));holdSpeech=false;
  ttsFailure=true;from=await input('请记住，我喜欢吃橙子',{key:'preference.food',layer:'profile',quote:'我喜欢吃橙子'});
  await wait(()=>events.slice(from).some(e=>e.type==='local.memory_speech_failed'));
  assert.ok(events.slice(from).some(e=>e.type==='local.notice'&&e.message.includes('语音播报暂时失败')));
  ws.send(JSON.stringify({type:'stop'}));await wait(()=>ws.readyState===WebSocket.CLOSED);
  console.log(JSON.stringify({saved:true,confirmedReplacement:true,failedWriteNeverSpokeSuccess:true,speculativeProviderOutputBlocked:true,interruptedHostAudioDropped:true,buttonInterruptStopsHostAudio:true,speechFailureFallsBackToText:true},null,2));
}finally{ws?.terminate();app.close();for(const c of upstream.clients)c.terminate();upstream.close();await delay(100);rmSync(root,{recursive:true,force:true});}
