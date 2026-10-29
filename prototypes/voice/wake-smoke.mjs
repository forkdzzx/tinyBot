// Fixed synthetic utterances only. PCM remains in memory; no microphone access.
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {nativeEnv} from './wake-channel.mjs';
import {WAKE_PHRASES} from '../expression/state.mjs';
import {loadConfig,ENDPOINT,sessionCreate} from './config.mjs';
import {synthesize,pcm16Frame} from '../evaluation/seeduplex.mjs';
const worker=fork(fileURLToPath(new URL('./wake-worker.mjs',import.meta.url)),[],{env:nativeEnv(),stdio:['ignore','ignore','inherit','ipc'],serialization:'advanced'});
const wait=type=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{worker.off('message',receive);reject(new Error(`Worker timeout: ${type}`));},20000);
  const receive=e=>{if(e.type===type||e.type==='error'){clearTimeout(timer);worker.off('message',receive);e.type==='error'?reject(new Error('Worker failure')):resolve(e);}};
  worker.on('message',receive);
});
const results=[];let current;
worker.on('message',e=>{if(e.type==='hit'&&current)current.detected=WAKE_PHRASES[e.index];});
try{
  await wait('ready');
  const config=loadConfig(),baseline={endpoint:ENDPOINT,request:sessionCreate(config.voice)};
  const cases=[...WAKE_PHRASES.map(text=>({text,expected:text})),...['Good morning.','What is your name?','我正在写代码。','The service is ready.','A jellyfish lives in the sea.'].map(text=>({text,expected:null}))];
  for(const [i,c]of cases.entries()){
    const {pcm}=await synthesize(config.key,baseline,c.text);
    current={...c,detected:null,audioSeconds:pcm.length/48000};results.push(current);
    const listen=wait('listening');worker.send({type:'listen',epoch:i});await listen;
    const started=performance.now();
    for(let frame=0;frame<Math.ceil(pcm.length/960)+100;frame++){
      const ack=wait('ack');worker.send({type:'audio',pcm:pcm16Frame(pcm,frame),epoch:i});await ack;
    }
    current.decodeMs=Math.round(performance.now()-started);current.pass=current.detected===c.expected;
    console.log(JSON.stringify(current));
  }
  await writeFile(new URL('../../runtime/wake-smoke.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),synthetic:true,results},null,2)+'\n');
  if(results.some(r=>!r.pass))process.exitCode=1;
}finally{worker.kill();}
