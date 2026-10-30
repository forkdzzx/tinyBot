// Real provider verification with isolated synthetic data and simulated playback
// receipts. This is not a microphone, speaker or human-hearing acceptance test.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
import {loadConfig,sessionCreate,ENDPOINT} from '../voice/config.mjs';
import {synthesize,pcm16Frame} from './seeduplex.mjs';
import {MEMORY_PROMPT_ID} from '../memory/tools.mjs';
if(process.argv[2]!=='--live'||process.argv.length!==3)throw new Error('Usage: node prototypes/evaluation/run-confirmation.mjs --live');
const config=loadConfig(),stamp=Date.now(),root=new URL(`../../runtime/evals/${stamp}-confirmation-data/`,import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});
const path=new URL(`../../runtime/evals/${stamp}-confirmation.json`,import.meta.url);
const report={at:new Date().toISOString(),promptId:MEMORY_PROMPT_ID,syntheticOnly:true,playbackReceipts:'simulated_after_audio_done',dataDirectory:root.pathname,sessions:[]};
const save=()=>writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
const questions=['请记住，我最喜欢喝红茶。','请记住，我现在最喜欢喝绿茶。','是的，按新的记。','请记住，我喜欢吃苹果。','结束聊天。','我最喜欢喝什么茶？'];
const audio=new Map();let app;
async function wait(check,ms=35000){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await delay(20);}throw new Error('probe_deadline');}
async function chat(phrases){
  const result={turns:[],events:[]};report.sessions.push(result);const ws=new WebSocket('ws://127.0.0.1:8794/voice',{origin:'http://127.0.0.1:8794'});let timer,failure;
  const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify(e));
  ws.on('error',()=>{failure='proxy_network';});
  ws.on('message',raw=>{const e=JSON.parse(raw);if(e.type!=='response.output_audio.delta'&&!e.type.endsWith('.delta'))result.events.push(e);if(e.type==='local.error')failure=e.message;});
  const get=(type,from)=>{if(failure)throw new Error(failure);return result.events.slice(from).find(e=>e.type===type);};
  try{
    await wait(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual',clientBuild:'confirmation-probe-20261030'});await wait(()=>get('local.ready',0));
    for(const q of phrases){
      const from=result.events.length;let frame=0;
      const originalWrite=app.store.write;
      if(q===questions[3])app.store.write=(p,v)=>{if(p.endsWith('memory.json'))throw new Error('injected_disk_failure');originalWrite(p,v);};
      try{
        send({type:'unmute'});timer=setInterval(()=>{send({type:'audio',audio:pcm16Frame(audio.get(q),frame++).toString('base64')});send({type:'heartbeat'});},20);
        if(q===questions[4]){await wait(()=>get('local.end',from));clearInterval(timer);await wait(()=>ws.readyState===WebSocket.CLOSED,5000);result.endedByVoice=true;break;}
        await wait(()=>get('response.output_audio.done',from));clearInterval(timer);send({type:'mute'});
        const done=get('response.output_audio.done',from);send({type:'playback',response_id:done.response_id,state:'completed'});await delay(100);
        result.turns.push({input:q,recognized:get('conversation.item.input_audio_transcription.completed',from)?.text,answer:get('response.output_text.done',from)?.text,status:get('local.memory_result',from)?.status,memory:structuredClone(app.store.state.memories)});save();
      }finally{clearInterval(timer);app.store.write=originalWrite;}
    }
  }finally{ws.terminate();clearInterval(timer);save();}
}
async function stop(){if(app){const previous=app;app=null;previous.close();await wait(()=>!previous.server.listening,5000);await delay(100);}}
try{
  for(const q of questions){audio.set(q,(await synthesize(config.key,{endpoint:ENDPOINT,request:sessionCreate(config.voice)},q)).pcm);}
  app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();
  await chat(questions.slice(0,5));
  await wait(()=>Object.values(app.store.state.jobs).every(j=>['done','failed'].includes(j.status)),45000);
  report.afterExtraction=structuredClone(app.store.state);await stop();
  app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();await chat([questions[5],questions[4]]);
  report.finalMemory=structuredClone(app.store.state.memories);report.status='needs_semantic_review';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{await stop();save();console.log(`Report: ${path.pathname}`);}
