// Isolated synthetic regression of the actual correction and interrupted reply.
// No microphone/recordings; playback completion/interruption is simulated.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
import {loadConfig,sessionCreate,ENDPOINT} from '../voice/config.mjs';
import {synthesize,pcm16Frame} from './seeduplex.mjs';
import {MEMORY_PROMPT_ID} from '../memory/tools.mjs';
import {MemoryStore,HistoryRecorder} from '../memory/store.mjs';
const negativeOnly=process.argv[3]==='--negative-only';
if(process.argv[2]!=='--live'||!(process.argv.length===3||(process.argv.length===4&&negativeOnly)))throw new Error('Usage: node prototypes/evaluation/run-correction.mjs --live [--negative-only]');
const config=loadConfig(),stamp=Date.now(),root=new URL(`../../runtime/evals/${stamp}-correction-data/`,import.meta.url),path=new URL(`../../runtime/evals/${stamp}-correction.json`,import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});
const report={at:new Date().toISOString(),promptId:MEMORY_PROMPT_ID,syntheticOnly:true,negativeOnly,playbackReceipts:'simulated_completed_or_button_interrupted',dataDirectory:root.pathname,sessions:[]};
const save=()=>writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
const q={red:'请记住，我现在最喜欢喝的是红茶。',plain:'不，请记住，我现在喜欢喝的是绿茶。',defer:'先不改。那我目前最喜欢喝的是什么茶？',green:'不，请记住，我现在最喜欢喝的是绿茶。',yes:'确认更新。',query:'我现在最喜欢喝的是什么茶？',oolong:'请记住，我现在最喜欢喝的是乌龙茶。',end:'结束聊天。'};
const audio=new Map();let app;
async function wait(check,ms=35000){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await delay(20);}throw new Error('probe_deadline');}
async function chat(cases){
  const result={turns:[],events:[]};report.sessions.push(result);const ws=new WebSocket('ws://127.0.0.1:8794/voice',{origin:'http://127.0.0.1:8794'});let timer,failure;
  const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify(e));
  ws.on('error',()=>{failure='proxy_network';});ws.on('message',raw=>{const e=JSON.parse(raw);if(!e.type.endsWith('.delta'))result.events.push(e);if(e.type==='local.error')failure=e.message;});
  const get=(type,from)=>{if(failure)throw new Error(failure);return result.events.slice(from).find(e=>e.type===type);};
  try{
    await wait(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual',clientBuild:'correction-probe-20261030'});await wait(()=>get('local.ready',0));
    for(const c of cases){
      const from=result.events.length;let frame=0;const inputFrames=Math.ceil(audio.get(c.text).length/960);send({type:'unmute'});
      timer=setInterval(()=>{send({type:'audio',audio:pcm16Frame(audio.get(c.text),frame++).toString('base64')});send({type:'heartbeat'});},20);
      if(c.text===q.end){await wait(()=>get('local.end',from));clearInterval(timer);await wait(()=>ws.readyState===WebSocket.CLOSED,5000);break;}
      await wait(()=>{
        if(frame<inputFrames)return false;
        const events=result.events.slice(from),asr=events.filter(e=>e.type==='conversation.item.input_audio_transcription.completed');
        if(c.query&&!asr.some(e=>/茶|饮品|喝/u.test(e.text||'')))return false;
        const lastAsr=events.findLastIndex(e=>e.type==='conversation.item.input_audio_transcription.completed');
        return events.slice(lastAsr+1).some(e=>e.type===(c.interrupt?'response.output_audio.started':'response.output_audio.done'));
      });clearInterval(timer);send({type:'mute'});
      const playback=result.events.slice(from).findLast(e=>e.type===(c.interrupt?'response.output_audio.started':'response.output_audio.done'));
      send({type:'playback',response_id:playback.response_id,state:c.interrupt?'interrupted':'completed'});if(c.interrupt)send({type:'interrupt'});await delay(150);
      const events=result.events.slice(from),statuses=events.filter(e=>e.type==='local.memory_result').map(e=>e.status);
      const turn={input:c.text,inputFrames,sentFrames:frame,recognized:events.filter(e=>e.type==='conversation.item.input_audio_transcription.completed').map(e=>e.text),answer:events.filter(e=>e.type==='response.output_text.done').map(e=>e.text).join(' '),statuses,interrupted:!!c.interrupt,memory:structuredClone(app.store.state.memories)};
      result.turns.push(turn);save();console.log(JSON.stringify({case:c.name,statuses}));assert.ok(statuses.includes(c.status),c.name);
      if(c.contains)assert.ok(turn.answer?.includes(c.contains),c.name+' answer');
    }
  }finally{ws.terminate();clearInterval(timer);save();}
}
async function stop(){if(app){const old=app;app=null;old.close();await wait(()=>!old.server.listening,5000);await delay(100);}}
try{
  for(const text of negativeOnly?[q.query,q.oolong,q.defer,q.end]:Object.values(q))audio.set(text,(await synthesize(config.key,{endpoint:ENDPOINT,request:sessionCreate(config.voice)},text)).pcm);
  if(negativeOnly){
    const store=new MemoryStore(fileURLToPath(root)),h=new HistoryRecorder(store,'manual'),u=h.user('请记住，我现在最喜欢喝的是绿茶。');
    store.remember(h.session.id,{key:'preference.drink',layer:'profile',source_entry_id:u.id,quote:'我现在最喜欢喝的是绿茶'},u.id);h.end('synthetic_fixture');
    report.fixture='Green-tea preference seeded locally; this run does not validate cloud save or replacement.';
  }
  app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();
  if(!negativeOnly){
  await chat([
    {name:'red_saved',text:q.red,status:'saved'},
    {name:'plain_correction_asks',text:q.plain,status:'confirmation_required',contains:'红茶',interrupt:true},
    {name:'interrupted_defer_reads_red',text:q.defer,status:'deferred_confirmation',contains:'红茶',query:true},
    {name:'favorite_correction_asks',text:q.green,status:'confirmation_required',contains:'红茶'},
    {name:'confirmed_replacement',text:q.yes,status:'saved'},
    {text:q.end},
  ]);
  await wait(()=>Object.values(app.store.state.jobs).every(j=>['done','failed'].includes(j.status)),45000);report.afterExtraction=structuredClone(app.store.state);await stop();
  app=createVoiceServer({config,port:8794,memoryRoot:fileURLToPath(root),withWake:false});await app.start();
  }
  await chat([
    {name:'reloaded_favorite_green',text:q.query,status:'recalled',contains:'绿茶'},
    {name:'oolong_compares_green',text:q.oolong,status:'confirmation_required',contains:'绿茶',interrupt:true},
    {name:'interrupted_defer_reads_green',text:q.defer,status:'deferred_confirmation',contains:'绿茶',query:true},
    {text:q.end},
  ]);
  await wait(()=>Object.values(app.store.state.jobs).every(j=>['done','failed'].includes(j.status)),45000);report.finalMemory=structuredClone(app.store.state);report.status='targeted_checks_passed_pending_review';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{await stop();save();console.log(`Report: ${path.pathname}`);}
