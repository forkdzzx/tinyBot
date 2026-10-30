import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket,{WebSocketServer} from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
const root=mkdtempSync(join(tmpdir(),'jarvis-mode-flow-'));let remote,n=0,holdNotice=false,failNotice=false,releaseNotice;const contexts=[];
const emit=e=>remote.send(JSON.stringify(e));
const provider=new WebSocketServer({host:'127.0.0.1',port:8799});
provider.on('connection',ws=>{remote=ws;ws.on('message',raw=>{const e=JSON.parse(raw);if(e.type==='session.create')emit({type:'session.created'});if(e.type==='session.close')emit({type:'session.closed'});if(e.type==='response.cancel')emit({type:'response.canceled'});
  if(e.type==='conversation.item.create'&&e.items?.[0]?.content?.[0]?.text?.startsWith('[Jarvis设备状态] '))contexts.push(JSON.parse(e.items[0].content[0].text.split('] ')[1]));
  if(e.type==='conversation.item.create'&&e.items?.[0]?.role==='tool'){const context=JSON.parse(e.items[0].content[0].text);emit({type:'response.output_text.done',response_id:'r'+n,text:context.announcement+'当前规则是'+context.id});emit({type:'response.done',response_id:'r'+n});}
});});
const app=createVoiceServer({config:{key:'test',voice:'test'},endpoint:'ws://127.0.0.1:8799',port:8798,memoryRoot:root,withWake:false,extract:async()=>({result:{summary:'',memories:[]}}),speak:async({onEvent,responseId})=>{if(failNotice&&responseId.startsWith('mode-notice-'))throw new Error('notice_failure');if(holdNotice&&responseId.startsWith('mode-notice-'))await new Promise(resolve=>{releaseNotice=resolve;});onEvent({type:'response.output_audio.started',response_id:responseId});onEvent({type:'response.output_audio.delta',response_id:responseId,delta:Buffer.alloc(960).toString('base64')});onEvent({type:'response.output_audio.done',response_id:responseId});}});
let ws,events=[];async function wait(f,ms=3000){const until=Date.now()+ms;while(Date.now()<until){if(f())return;await delay(10);}throw new Error('deadline');}
async function connect(){events=[];ws=new WebSocket('ws://127.0.0.1:8798/voice',{origin:'http://127.0.0.1:8798'});ws.on('message',r=>events.push(JSON.parse(r)));await wait(()=>ws.readyState===WebSocket.OPEN);ws.send(JSON.stringify({type:'start',mode:'manual'}));await wait(()=>events.some(e=>e.type==='local.ready'));}
async function input(text,{read=true}={}){n++;const from=events.length;emit({type:'conversation.item.input_audio_transcription.started'});emit({type:'conversation.item.input_audio_transcription.completed',text});emit({type:'response.output_text.done',response_id:'stale'+n,text:'正常回答'});if(read)emit({type:'response.function_call_arguments.done',items:[{name:'read_mode_context',call_id:'mode'+n,arguments:'{}'}]});await wait(()=>events.slice(from).some(e=>e.type==='conversation.item.input_audio_transcription.completed'));await delay(100);return events.slice(from);}
try{
  await app.start();await connect();let out=await input('陪我练英语');assert.equal(app.modes.current,'english');assert.ok(out.some(e=>e.text==='已切换到英语练习模式。'));
  out=await input('用中文解释 breakfast');assert.ok(out.some(e=>e.text==='当前规则是english'));assert.equal(contexts.at(-1).id,'english');
  await input('不练英语，只是聊天');assert.equal(app.modes.current,'daily');await input('我正在写代码');await input('Java 接口与抽象类');assert.equal(app.modes.current,'work');await input('不要切换');assert.equal(app.modes.current,'daily');
  await input('进入陪伴模式');await input('我正在写代码');assert.equal(app.modes.current,'companion');ws.send(JSON.stringify({type:'stop'}));await wait(()=>ws.readyState===WebSocket.CLOSED);
  await connect();assert.ok(events.some(e=>e.type==='local.mode_state'&&e.id==='companion'&&!e.autoLocked));await input('我正在写代码');assert.equal(app.modes.current,'work');
  const from=events.length;await input('你好',{read:false});assert.ok(events.slice(from).some(e=>e.text==='正常回答'));assert.equal(contexts.at(-1).id,'work');
  holdNotice=true;out=await input('进入陪伴模式，聊聊比赛');assert.ok(out.some(e=>e.response_id?.startsWith('mode-notice-')));assert.ok(!out.some(e=>e.text==='正常回答'||e.response_id==='r'+n));
  releaseNotice();holdNotice=false;await wait(()=>events.some(e=>e.response_id==='r'+n));
  holdNotice=true;out=await input('进入工作模式，解释线程');const noticeId=out.find(e=>e.response_id?.startsWith('mode-notice-')).response_id;const interruptedFrom=events.length;
  ws.send(JSON.stringify({type:'interrupt'}));await wait(()=>events.slice(interruptedFrom).some(e=>e.type==='local.interrupted'));releaseNotice();holdNotice=false;await delay(100);
  assert.ok(!events.slice(interruptedFrom).some(e=>e.type.startsWith('response.output_')&&(e.response_id===noticeId||e.response_id==='r'+n)));
  failNotice=true;out=await input('进入陪伴模式，聊聊比赛');assert.ok(out.some(e=>e.type==='local.notice'&&e.message.includes('切换提示音频暂时失败')));assert.ok(out.some(e=>e.text==='正常回答'));failNotice=false;
  holdNotice=true;out=await input('进入工作模式，解释线程');const speechNoticeId=out.find(e=>e.response_id?.startsWith('mode-notice-')).response_id;const queuedId='r'+n,releaseOld=releaseNotice;
  const spokenFrom=events.length;await input('你好');releaseOld();holdNotice=false;await delay(100);
  assert.ok(!events.slice(spokenFrom).some(e=>e.type.startsWith('response.output_')&&(e.response_id===speechNoticeId||e.response_id===queuedId)));
  ws.send(JSON.stringify({type:'stop'}));await wait(()=>ws.readyState===WebSocket.CLOSED);
  console.log(JSON.stringify({manualModes:true,changedContextSent:true,rollbackAndLock:true,newSessionRetainsModeAndUnlocks:true,ordinaryChatDoesNotRequireTool:true,noticeBeforeAnswer:true,interruptDropsNoticeAndQueuedAnswer:true,noticeFailureKeepsAnswer:true,spokenInterruptionDropsOldQueue:true},null,2));
}finally{ws?.terminate();app.close();for(const c of provider.clients)c.terminate();provider.close();await delay(100);rmSync(root,{recursive:true,force:true});}
