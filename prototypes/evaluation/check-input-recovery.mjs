import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket,{WebSocketServer} from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
const root=mkdtempSync(join(tmpdir(),'jarvis-input-recovery-'));let remote,commits=0,completeOnCommit=true,seq=0;
const emit=e=>remote.send(JSON.stringify(e));
const provider=new WebSocketServer({host:'127.0.0.1',port:8793});
provider.on('connection',ws=>{remote=ws;ws.on('message',raw=>{const e=JSON.parse(raw);
  if(e.type==='session.create')emit({type:'session.created'});
  if(e.type==='session.close')emit({type:'session.closed'});
  if(e.type==='response.cancel')emit({type:'response.canceled'});
  if(e.type==='conversation.item.create'&&e.items?.some(i=>i.role==='tool'))emit({type:'response.done'});
  if(e.type==='input_audio_buffer.commit'){commits++;if(completeOnCommit){emit({type:'conversation.item.input_audio_transcription.completed',text:'对对，请保存吧。'});emit({type:'response.done'});}}
});});
const app=createVoiceServer({config:{key:'fixture',voice:'fixture'},endpoint:'ws://127.0.0.1:8793',port:8792,memoryRoot:root,withWake:false,extractPractice:async()=>({result:{vocabulary:[],corrections:[]}}),extract:async()=>({result:{summary:'',memories:[]}}),speak:async({onEvent,responseId})=>{
  for(const event of [{type:'response.output_audio.started'},{type:'response.output_audio.delta',delta:Buffer.alloc(960).toString('base64')},{type:'response.output_audio.done'}])onEvent({...event,response_id:responseId});
}});
let ws;const events=[];const send=e=>ws.send(JSON.stringify(e));
async function wait(f,ms=3500){const end=Date.now()+ms;while(Date.now()<end){if(f())return;await delay(10);}throw new Error('recovery_test_deadline');}
async function input(text){emit({type:'conversation.item.input_audio_transcription.started'});emit({type:'conversation.item.input_audio_transcription.completed',text});}
async function remember(text){const from=events.length;await input(text);emit({type:'response.function_call_arguments.done',items:[{name:'remember_user_fact',call_id:'m'+(++seq),arguments:JSON.stringify({key:'preference.drink',layer:'profile',quote:text.replace('请记住，','')})}]});await wait(()=>events.slice(from).some(e=>e.type==='response.output_audio.done'));const audio=events.slice(from).find(e=>e.type==='response.output_audio.done');send({type:'playback',response_id:audio.response_id,state:'completed'});await delay(30);}
try{
 await app.start();ws=new WebSocket('ws://127.0.0.1:8792/voice',{origin:'http://127.0.0.1:8792'});ws.on('message',raw=>events.push(JSON.parse(raw)));
 await wait(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual'});await wait(()=>events.some(e=>e.type==='local.ready'));
 await remember('请记住，我最喜欢红茶');await remember('请记住，我最喜欢绿茶');
 const revision=app.store.state.revision,from=events.length;emit({type:'conversation.item.input_audio_transcription.started'});emit({type:'conversation.item.input_audio_transcription.delta',delta:'对对，请保存吧。'});
 await wait(()=>events.slice(from).some(e=>e.type==='local.input_state'&&e.stalled),7500);const state=events.findLast(e=>e.type==='local.input_state');
 assert.equal(commits,0);assert.equal(app.store.state.revision,revision);assert.match(app.store.favoriteDrinkReply('我最喜欢喝什么茶？'),/红茶/);
 send({type:'finish_input',turn:state.turn-1});await delay(40);assert.equal(commits,0);
 send({type:'finish_input',turn:state.turn});send({type:'finish_input',turn:state.turn});await wait(()=>events.slice(from).some(e=>e.type==='local.memory_result'&&e.status==='saved'));
 assert.equal(commits,1);assert.match(app.store.favoriteDrinkReply('我最喜欢喝什么茶？'),/绿茶/);
 completeOnCommit=false;const stalledFrom=events.length;emit({type:'conversation.item.input_audio_transcription.started'});emit({type:'conversation.item.input_audio_transcription.delta',delta:'另一句没有结束的输入'});
 await wait(()=>events.slice(stalledFrom).some(e=>e.type==='local.input_state'&&e.stalled),7500);send({type:'finish_input',turn:events.findLast(e=>e.type==='local.input_state').turn});
 await wait(()=>events.slice(stalledFrom).some(e=>e.type==='local.error'&&e.message.includes('仍未识别完成')),9000);await wait(()=>ws.readyState===WebSocket.CLOSED);
 console.log(JSON.stringify({partialNeverCommitsMemory:true,stallVisible:true,explicitFinishSingleUse:true,lateClickRejected:true,finalThenConfirmationSaved:true,failedRecoveryClosesVisible:true},null,2));
}finally{ws?.terminate();app.close();for(const c of provider.clients)c.terminate();provider.close();await delay(100);rmSync(root,{recursive:true,force:true});}
