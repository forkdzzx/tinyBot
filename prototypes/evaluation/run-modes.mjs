// Synthetic provider checks in an isolated data directory, no microphone/audio files.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
import {loadConfig,sessionCreate,ENDPOINT} from '../voice/config.mjs';
import {synthesize,pcm16Frame} from './seeduplex.mjs';
import {MODE_PROMPT_ID} from '../modes/tools.mjs';
if(process.argv[2]!=='--live'||process.argv.length!==3)throw new Error('Usage: node prototypes/evaluation/run-modes.mjs --live');
const config=loadConfig(),stamp=Date.now(),root=new URL(`../../runtime/evals/${stamp}-modes-data/`,import.meta.url),path=new URL(`../../runtime/evals/${stamp}-modes.json`,import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});
const report={at:new Date().toISOString(),promptId:MODE_PROMPT_ID,syntheticOnly:true,simulatedPlaybackReceipts:true,dataDirectory:root.pathname,sessions:[]};
const cases=[
  ["What's your name?",'daily'],['陪我练英语。','english'],["Let's talk about breakfast.",'english'],['我不明白 breakfast 是什么意思，请用中文解释。','english'],['不练英语，只是聊天。','daily'],
  ['我正在写代码，Java 接口是什么？','daily'],['抽象类和接口有什么区别？','work'],['不要切换。','daily'],['Java 继承和多态有什么关系？','daily'],['进入陪伴模式。','companion'],
];
const next=[['我正在写代码，什么是线程？','work']],restart=[['现在是什么模式？','daily']];
const audio=new Map();let app;
const save=()=>writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
async function wait(f,ms=40000){const end=Date.now()+ms;while(Date.now()<end){if(f())return;await delay(20);}throw new Error('mode_probe_deadline');}
async function chat(inputs){
  const session={events:[],turns:[]};report.sessions.push(session);const ws=new WebSocket('ws://127.0.0.1:8794/voice',{origin:'http://127.0.0.1:8794'});let timer,failure;
  const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify(e));
  ws.on('error',()=>{failure='proxy_network';});ws.on('message',raw=>{const e=JSON.parse(raw);if(!e.type.endsWith('.delta'))session.events.push(e);if(e.type==='local.error')failure=e.message;});
  try{
    await wait(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual',clientBuild:'modes-probe-20261030'});await wait(()=>session.events.some(e=>e.type==='local.ready'));session.initialMode=session.events.find(e=>e.type==='local.mode_state');
    for(const [text,expected] of inputs){
      const from=session.events.length;let frame=0;const pcm=audio.get(text),frames=Math.ceil(pcm.length/960);send({type:'unmute'});
      timer=setInterval(()=>{send({type:'audio',audio:pcm16Frame(pcm,frame++).toString('base64')});send({type:'heartbeat'});},20);
      await wait(()=>{if(failure)throw new Error(failure);const events=session.events.slice(from),index=events.findLastIndex(e=>e.type==='conversation.item.input_audio_transcription.completed');return frame>=frames&&index>=0&&events.slice(index+1).some(e=>e.type==='response.output_audio.done');});
      clearInterval(timer);send({type:'mute'});const events=session.events.slice(from),done=events.findLast(e=>e.type==='response.output_audio.done');send({type:'playback',response_id:done.response_id,state:'completed'});await delay(150);
      const turn={input:text,recognized:events.filter(e=>e.type==='conversation.item.input_audio_transcription.completed').map(e=>e.text),answer:events.filter(e=>e.type==='response.output_text.done').map(e=>e.text).join(' '),mode:events.findLast(e=>e.type==='local.mode_state'),expected};session.turns.push(turn);save();console.log(JSON.stringify({input:text,mode:turn.mode?.id}));
      assert.equal(turn.mode?.id,expected);assert.ok(!turn.answer.includes('没有取得当前对话规则'));
    }
    send({type:'stop'});await wait(()=>ws.readyState===WebSocket.CLOSED,5000);
  }finally{clearInterval(timer);ws.terminate();save();}
}
async function stop(){if(app){const old=app;app=null;old.close();await wait(()=>!old.server.listening,5000);await delay(100);}}
try{
  for(const [text] of [...cases,...next,...restart])audio.set(text,(await synthesize(config.key,{endpoint:ENDPOINT,request:sessionCreate(config.voice)},text)).pcm);
  app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();await chat(cases);await chat(next);
  assert.equal(report.sessions[1].initialMode.id,'companion');assert.equal(report.sessions[1].initialMode.autoLocked,false);
  await stop();app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();await chat(restart);assert.equal(report.sessions[2].initialMode.id,'daily');
  report.status='state_checks_passed_content_needs_review';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{await stop();save();console.log(`Report: ${path.pathname}`);}
