// One provider-protocol probe. No microphone, stored audio, or personal memory.
import WebSocket from 'ws';
import {writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {loadConfig,sessionCreate,ENDPOINT} from '../voice/config.mjs';
import {synthesize,pcm16Frame} from './seeduplex.mjs';
if(process.argv[2]!=='--live'||process.argv.length!==3)throw new Error('Use --live explicitly');
const config=loadConfig(),report={syntheticOnly:true,input:'你叫什么名字？',events:[],audioBytes:0,commitSent:false,finalBeforeCommit:false};
const path=new URL(`../../runtime/evals/${Date.now()}-input-commit.json`,import.meta.url);let ws,upload,deadline;
try{
 const synthesized=await synthesize(config.key,{endpoint:ENDPOINT,request:sessionCreate(config.voice)},report.input);report.synthesisUsage=synthesized.usage;
 const pcm=synthesized.pcm,frames=Math.ceil(pcm.length/960)+5;let frame=0;const started=performance.now();
 await new Promise((resolve,reject)=>{
  ws=new WebSocket(ENDPOINT,{headers:{'X-Api-Key':config.key},handshakeTimeout:10000,maxPayload:2*1024*1024});
  const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify({...e,event_id:randomUUID()}));
  deadline=setTimeout(()=>reject(new Error('probe_deadline')),30000);ws.on('error',()=>reject(new Error('network_error')));
  ws.on('unexpected-response',(_r,res)=>{res.resume();reject(new Error(`HTTP_${res.statusCode}`));});
  ws.on('open',()=>send(sessionCreate(config.voice)));
  ws.on('message',raw=>{try{const e=JSON.parse(raw),ms=Math.round(performance.now()-started);
   if(e.type==='error')return reject(new Error('provider_error_'+String(e.error?.code??e.code??'unknown').replace(/[^\w-]/g,'').slice(0,40)));
   if(e.type==='session.created'){send({type:'input_audio_unmute.commit'});upload=setInterval(()=>{send({type:'input_audio_buffer.append',audio:pcm16Frame(pcm,frame++).toString('base64')});if(frame===frames&&!report.finalBeforeCommit){report.commitSent=true;report.commitMs=Math.round(performance.now()-started);send({type:'input_audio_buffer.commit'});}},20);}
   if(e.type==='conversation.item.input_audio_transcription.completed'){if(!report.commitSent)report.finalBeforeCommit=true;report.recognized=e.text||e.transcript;report.finalMs=ms;}
   if(e.type==='response.output_audio.delta')report.audioBytes+=Buffer.from(e.delta,'base64').length;
   if(e.type==='response.output_text.done')report.answer=e.text;
   if(e.type==='response.done')report.usage=e.response?.usage;
   if(!e.type.endsWith('.delta'))report.events.push({type:e.type,ms});
   if(e.type==='response.output_audio.done'){clearInterval(upload);send({type:'input_audio_mute.commit'});send({type:'session.close'});}
   if(e.type==='session.closed')resolve();
  }catch{reject(new Error('event_failure'));}});
 });
 report.status=report.commitSent&&report.finalMs>=report.commitMs&&report.audioBytes>0?'commit_final_and_audio_received':'not_exercised_or_incomplete';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{clearTimeout(deadline);clearInterval(upload);ws?.terminate();writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:report.status,report:path.pathname}));}
