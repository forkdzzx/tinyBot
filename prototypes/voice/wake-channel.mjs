import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {mkdirSync,appendFileSync} from 'node:fs';
import {WAKE_PHRASES} from '../expression/state.mjs';
import {WakeInputStats} from './wake-stats.mjs';
import {EXPERIMENTAL_WAKE_INDEXES} from './wake-core.mjs';

export class WakeGrants {
  constructor(now=Date.now){this.now=now;this.token=null;}
  issue(){this.token=randomUUID();this.expires=this.now()+15000;return this.token;}
  consume(token){const ok=typeof token==='string'&&token===this.token&&this.now()<this.expires;if(ok)this.clear();return ok;}
  clear(){this.token=null;}
}
export function nativeEnv(){
  // Keep cloud credentials out of the recognizer process entirely.
  const env={PATH:process.env.PATH};
  const platform=process.platform==='win32'?'win':process.platform;
  const lib=fileURLToPath(new URL(`../../node_modules/sherpa-onnx-${platform}-${process.arch}/`,import.meta.url));
  if(process.platform==='darwin')env.DYLD_LIBRARY_PATH=lib;
  if(process.platform==='linux')env.LD_LIBRARY_PATH=lib;
  return env;
}
export function attachWakeChannel(wss,grants){
  wss.on('connection',client=>{
    let worker,ready=false,enabled=false,pending=0,epoch=0,closed=false;
    const send=e=>{if(client.readyState===1)client.send(JSON.stringify(e));};
    const stats=new WakeInputStats();let processed=0,windowProcessed=0;
    const logDir=new URL('../../runtime/wake/',import.meta.url);
    const logPath=new URL(`${Date.now()}-${randomUUID()}.jsonl`,logDir);
    const log=e=>{try{mkdirSync(logDir,{recursive:true,mode:0o700});appendFileSync(logPath,JSON.stringify({at:new Date().toISOString(),epoch,...e})+'\n',{mode:0o600});}catch{send({type:'wake.error',message:'本地唤醒诊断日志无法保存，请检查目录权限。'});client.close();}};
    const activity=()=>{
      const data={...stats.take(),processedFrames:processed-windowProcessed,pending};windowProcessed=processed;
      log({type:'wake.input',...data});send({type:'wake.activity',...data});
    };
    const activityTimer=setInterval(()=>{if(enabled)activity();},2000);
    const fail=(code='worker_failure')=>{log({type:'wake.error',code:typeof code==='string'?code:'worker_failure'});send({type:'wake.error',message:'本地唤醒未就绪，请检查模型与原生依赖；不会上传待机声音。'});client.close();};
    log({type:'wake.open',profile:'zh-en-3M-20251220/score1/threshold.25/blanks8/hi-only-experiment'});
    const initTimer=setTimeout(()=>fail('init_timeout'),20000);
    worker=fork(fileURLToPath(new URL('./wake-worker.mjs',import.meta.url)),[],{
      env:nativeEnv(),stdio:['ignore','ignore','ignore','ipc'],serialization:'advanced',
    });
    worker.on('error',fail);
    worker.on('exit',()=>{if(!closed)fail();});
    worker.on('message',e=>{
      if(e.type==='ready'){clearTimeout(initTimer);ready=true;log({type:'wake.ready'});send({type:'wake.ready',phrases:EXPERIMENTAL_WAKE_INDEXES.map(i=>WAKE_PHRASES[i])});}
      else if(e.type==='ack'){pending=Math.max(0,pending-1);processed++;}
      else if(e.type==='listening'&&e.epoch===epoch){enabled=true;log({type:'wake.listening'});send({type:'wake.listening'});}
      else if(e.type==='hit'&&enabled&&e.epoch===epoch&&EXPERIMENTAL_WAKE_INDEXES.includes(e.index)){
        activity();enabled=false;log({type:'wake.detected',phrase:WAKE_PHRASES[e.index]});
        send({type:'wake.detected',phrase:WAKE_PHRASES[e.index],ticket:grants.issue()});
      }else if(e.type==='error')fail();
    });
    client.on('message',(raw,binary)=>{
      if(binary){
        if(!enabled||!ready)return;
        if(raw.length!==640)return fail('invalid_frame');
        if(pending>=100)return fail('worker_backlog');
        stats.add(raw);pending++;worker.send({type:'audio',pcm:raw,epoch});return;
      }
      let e;try{e=JSON.parse(raw);}catch{return fail();}
      if(e.type==='listen'&&ready){if(enabled)activity();enabled=false;grants.clear();worker.send({type:'listen',epoch:++epoch});}
      if(e.type==='pause'){if(enabled)activity();enabled=false;log({type:'wake.pause'});worker.send({type:'pause',epoch:++epoch});}
      if(e.type==='capture_state'){
        log({type:'wake.capture_state',contextState:['running','suspended','closed','interrupted'].includes(e.contextState)?e.contextState:'unknown',
          sampleRate:e.sampleRate===16000?16000:null,trackLive:e.trackLive===true,trackMuted:e.trackMuted===true});
      }
    });
    client.on('error',()=>client.close());
    client.on('close',()=>{closed=true;if(enabled)activity();enabled=false;log({type:'wake.closed'});clearTimeout(initTimer);clearInterval(activityTimer);grants.clear();worker.kill();});
  });
}
