// Real-service smoke test with an isolated data directory, never user memory.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import WebSocket from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
import {loadConfig,sessionCreate,ENDPOINT} from '../voice/config.mjs';
import {synthesize,pcm16Frame} from './seeduplex.mjs';
import {memorySession,MEMORY_PROMPT_ID} from '../memory/tools.mjs';

const repair=process.argv[3]==='--repair';
if(process.argv[2]!=='--live'||(repair?process.argv.length!==4:process.argv.length!==3))throw new Error('Usage: node prototypes/evaluation/run-memory.mjs --live [--repair] (uses existing cloud services)');
const suite=repair?'memory-repair':'memory-v1';
const config=loadConfig(),stamp=Date.now(),root=new URL(`../../runtime/evals/${stamp}-${suite}-data/`,import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});
const reportPath=new URL(`../../runtime/evals/${stamp}-${suite}.json`,import.meta.url);
const report={date:new Date().toISOString(),syntheticOnly:true,dataDirectory:root.pathname,promptId:MEMORY_PROMPT_ID,promptSha256:createHash('sha256').update(memorySession(config.voice).session.instructions).digest('hex'),suite,limits:'Synthesized questions, 2 speech sessions, background extraction capped by persistent job attempts; no microphone/playback; isolated data.',synthesis:[],sessions:[]};
const save=()=>writeFileSync(reportPath,JSON.stringify(report,null,2),{mode:0o600});
const questions=repair?['我想说一下，请你记住，我喜欢喝红茶。','我想说中文了。','我又有点不想聊天了，先结束吧。','我喜欢喝什么茶？','OK，可以结束。']:['请记住，我在午后喜欢喝乌龙茶。','另外，我的周末爱好是烘焙面包。','我午后喜欢喝什么？周末的爱好是什么？','你有帮我设置提醒吗？'];
const audio=new Map();let app;
async function waitFor(check,ms=35000){const until=Date.now()+ms;while(Date.now()<until){const result=check();if(result)return result;await delay(25);}throw new Error('probe deadline');}
async function chat(phrases,{naturalEnd=false}={}){
  const events=[],entry={questions:phrases,events,answers:[],audioBytes:0};report.sessions.push(entry);save();
  const ws=new WebSocket('ws://127.0.0.1:8791/voice',{origin:'http://127.0.0.1:8791'});let failure=null,upload;
  const send=e=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(e));};
  ws.on('error',()=>{failure='local proxy network error';});
  ws.on('message',raw=>{const e=JSON.parse(raw);if(e.type==='response.output_audio.delta')entry.audioBytes+=Buffer.from(e.delta,'base64').length;
    else if(!e.type.endsWith('.delta'))events.push(e);
    if(e.type==='local.error')failure=e.message;
  });
  const get=(type,from=0)=>{if(failure)throw new Error(failure);return events.slice(from).find(e=>e.type===type);};
  try{
    await waitFor(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual'});await waitFor(()=>get('local.ready'));
    for(const phrase of phrases){
      const from=events.length;let frame=0;send({type:'unmute'});
      upload=setInterval(()=>{send({type:'audio',audio:pcm16Frame(audio.get(phrase),frame++).toString('base64')});send({type:'heartbeat'});},20);
      if(naturalEnd&&phrase===phrases.at(-1)){
        await waitFor(()=>get('local.end',from));clearInterval(upload);
        await waitFor(()=>ws.readyState===WebSocket.CLOSED,5000);entry.endedByVoice=true;save();break;
      }
      const answer=await waitFor(()=>get('response.output_text.done',from));
      await waitFor(()=>get('response.output_audio.done',from));await waitFor(()=>get('local.usage',from));
      clearInterval(upload);send({type:'mute'});entry.answers.push({memoryAtAnswer:repair?structuredClone(app.store.state.memories):undefined,recognized:get('conversation.item.input_audio_transcription.completed',from)?.text,answer:answer.text});save();
    }
    if(!entry.endedByVoice){send({type:'stop'});await waitFor(()=>get('local.closed'),5000);await waitFor(()=>ws.readyState===WebSocket.CLOSED,5000);}
  }finally{clearInterval(upload);ws.terminate();save();}
}
async function stopApp(){if(!app)return;const old=app;app=null;old.close();await waitFor(()=>!old.server.listening,5000);await delay(100);}
try{
  for(const text of questions){const r=await synthesize(config.key,{endpoint:ENDPOINT,request:sessionCreate(config.voice)},text);audio.set(text,r.pcm);report.synthesis.push({text,seconds:r.pcm.length/48000,usage:r.usage});save();}
  app=createVoiceServer({config,port:8791,memoryRoot:fileURLToPath(root),withWake:false});await app.start();
  await chat(questions.slice(0,repair?3:2),{naturalEnd:repair});
  await waitFor(()=>{const jobs=Object.values(app.store.state.jobs);return jobs.length&&jobs.every(j=>['done','failed'].includes(j.status));},45000);
  report.afterFirstSession=structuredClone(app.store.state);save();await stopApp();
  app=createVoiceServer({config,port:8791,memoryRoot:fileURLToPath(root),withWake:false});await app.start();
  report.afterReload=structuredClone(app.store.state);
  await chat(questions.slice(repair?3:2),{naturalEnd:repair});report.afterSecondSession=structuredClone(app.store.state);report.completedAt=new Date().toISOString();report.status='needs_semantic_review';
}catch(error){report.error=error.message;report.status='failed';process.exitCode=1;}
finally{await stopApp();save();console.log(`Report: ${reportPath.pathname}`);}
