import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, appendFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import { ENDPOINT, loadConfig, sessionCreate, ACTIVE_PROMPT_ID } from './config.mjs';
import { ResponseGuard } from './guard.mjs';
import { sessionCommand } from './lifecycle.mjs';
import {timingDiagnostic} from './timing.mjs';
import { attachWakeChannel, WakeGrants } from './wake-channel.mjs';
import {MemoryStore,HistoryRecorder} from '../memory/store.mjs';
import {MemoryWorker} from '../memory/worker.mjs';
import {memorySession,MemoryTools,MEMORY_PROMPT_ID} from '../memory/tools.mjs';
import {explicitRemember} from '../memory/policy.mjs';
import {memorySpeech,streamMemorySpeech} from './memory-speech.mjs';

export function createVoiceServer({config,endpoint=ENDPOINT,port=8766,memoryRoot=fileURLToPath(new URL('../../runtime/data/',import.meta.url)),withWake=true,extract,speak=streamMemorySpeech,memorySandbox=false}={}){
let store,worker;
function initializeMemory(){
store=new MemoryStore(memoryRoot);
worker=new MemoryWorker(store,{...(extract?{extract}:{}),onStatus:e=>{
  try{appendFileSync(new URL('../../runtime/voice/memory-worker.jsonl',import.meta.url),JSON.stringify({at:new Date().toISOString(),...e})+'\n',{mode:0o600});}catch{}
}});
worker.start();
}
const host = `127.0.0.1:${port}`;
const origin = `http://${host}`;
const files = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/client.mjs',['client.mjs','text/javascript; charset=utf-8']],
  ['/capture.mjs',['capture.mjs','text/javascript; charset=utf-8']],
  ['/playback.mjs',['playback.mjs','text/javascript; charset=utf-8']],
  ['/lifecycle.mjs',['lifecycle.mjs','text/javascript; charset=utf-8']],
  ['/intent-text.mjs',['intent-text.mjs','text/javascript; charset=utf-8']],
  ['/timing.mjs',['timing.mjs','text/javascript; charset=utf-8']],
  ['/playback-test',['playback-test.html','text/html; charset=utf-8']],
  ['/playback-test.mjs',['playback-test.mjs','text/javascript; charset=utf-8']],
]);
const server = http.createServer(async(req,res)=> {
  if(req.headers.host===host&&req.method==='GET'&&req.url==='/favicon.ico')return res.writeHead(204).end();
  const asset=files.get(req.url);
  if(req.headers.host !== host || req.method !== 'GET' || !asset) return res.writeHead(404).end();
  try {
    let body=await readFile(new URL(asset[0],import.meta.url));
    if(memorySandbox&&req.url==='/')body=body.toString().replace('<h1>Jarvis · 实时语音验证</h1>','<h1>Jarvis · 隔离记忆测试</h1><p role="note"><strong>这里使用独立测试记忆，不会改动你的个人记忆。可以使用下面教程中的虚构偏好；仍会调用云端服务。</strong></p>');
    res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store',
      'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'`,
      'Permissions-Policy':'microphone=(self), camera=()', 'X-Content-Type-Options':'nosniff'}).end(body);
  } catch { res.writeHead(500).end(); }
});
const wss = new WebSocketServer({noServer:true,maxPayload:8192});
const wakeWss = new WebSocketServer({noServer:true,maxPayload:8192});
const grants = new WakeGrants();
if(withWake)attachWakeChannel(wakeWss,grants);
server.on('upgrade',(req,socket,head)=> {
  const target=req.url==='/wake'?wakeWss:req.url==='/voice'?wss:null;
  if(req.headers.host !== host || req.headers.origin !== origin || !target || target.clients.size) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;
  }
  target.handleUpgrade(req,socket,head,client=>target.emit('connection',client));
});
mkdirSync(new URL('../../runtime/voice',import.meta.url),{recursive:true,mode:0o700});
wss.on('connection',client=> {
  const logPath=new URL(`../../runtime/voice/${Date.now()}-${randomUUID()}.jsonl`,import.meta.url);
  let upstream=null, ready=false, closing=false, audioFrames=0;
  let creationTimer, closeTimer, cancelTimer;
  let paused=false, lastHeartbeat=Date.now();
  let history=null,memoryTools=null,historyFinished=false;
  let memoryOwned=false,memorySpeechAbort=null,memoryFeedbackTimer=null,turnRevision=0;
  let mainTurnDone=false,contextFeedback=null;
  const guard=new ResponseGuard();
  const started=performance.now();
  const send=e=>client.readyState===WebSocket.OPEN && client.send(JSON.stringify(e));
  const cloud=e=>upstream?.readyState===WebSocket.OPEN && upstream.send(JSON.stringify({...e,event_id:randomUUID()}));
  const log=e=> {
    try { appendFileSync(logPath,JSON.stringify({at:new Date().toISOString(),ms:Math.round(performance.now()-started),...e})+'\n',{mode:0o600}); }
    catch { send({type:'local.error',message:'日志保存失败，停止本次验证'}); stop(); }
  };
  function finishHistory(reason){
    if(historyFinished)return;historyFinished=true;memoryTools?.close();
    try{history?.end(reason);worker.kick();}
    catch{send({type:'local.error',message:'文字历史或待提炼任务保存失败；请保留本地文件排查'});}
  }
  function stop(reason='client_end') {
    if(closing) return;
    closing=true; ready=false;
    memorySpeechAbort?.abort();clearTimeout(memoryFeedbackTimer);
    finishHistory(reason);
    clearTimeout(creationTimer); clearTimeout(cancelTimer); clearInterval(watchdog);
    cloud({type:'session.close'});
    closeTimer=setTimeout(()=>{upstream?.terminate(); client.close();},2500);
    if(!upstream) client.close();
  }
  function fail(message) {
    // Only our own fixed strings/codes are surfaced; never raw request headers.
    send({type:'local.error',message});
    log({type:'local.error',message});
    stop();
  }
  function cancel() {
    if(!ready || guard.pending) return;
    history?.interrupt();
    guard.interrupt();
    send({type:'local.interrupted'});
    cloud({type:'response.cancel'});
    log({type:'local.interrupted'});
    cancelTimer=setTimeout(()=>fail('打断确认超时，请重新开始会话'),5000);
  }
  function syncMemoryWording(){
    if(!closing&&mainTurnDone&&contextFeedback?.complete){
      cloud({type:'conversation.item.create',items:[{role:'assistant',content:[{type:'input_text',text:contextFeedback.text}]}]});contextFeedback=null;
    }
  }
  function localMemoryFeedback(result){
    if(closing)return;
    memoryOwned=true;clearTimeout(memoryFeedbackTimer);memorySpeechAbort?.abort();
    const revision=turnRevision,id=`memory-${randomUUID()}`,text=memorySpeech(result);
    const controller=new AbortController();memorySpeechAbort=controller;
    contextFeedback={text,complete:false};
    // Clear any speculative conversation audio before sending authoritative text.
    send({type:'local.memory_result',status:result.status,message:text});
    try{
      if(result.status==='confirmation_required')store.bindConfirmation(result.memoryId,result.offer.token,id);
      const event={type:'response.output_text.done',response_id:id,text};
      history?.output(event,{source:'local_memory'});send(event);log({...event,source:'local_memory'});
    }catch{fail('确认状态或文字历史保存失败，请保留文件排查');return;}
    speak({config,text,responseId:id,signal:controller.signal,onEvent:event=>{
      if(closing||revision!==turnRevision||controller.signal.aborted)return;
      try{
        if(event.type==='response.output_audio.started')history?.output(event,{source:'local_memory'});
        send(event);if(event.type!=='response.output_audio.delta')log({...event,source:'local_memory'});
      }catch{fail('记忆播报状态保存失败');}
    },onUsage:usage=>log({type:'local.memory_speech_usage',usage})}).then(()=>{
      if(closing||revision!==turnRevision||controller.signal.aborted)return;
      // Keep the latest assistant wording in cloud context aligned with the
      // host-controlled reply; the next personal query still reads the store.
      if(contextFeedback){contextFeedback.complete=true;syncMemoryWording();}
    }).catch(()=>{
      if(closing||revision!==turnRevision||controller.signal.aborted)return;
      log({type:'local.memory_speech_failed',status:result.status});
      send({type:'local.notice',message:`语音播报暂时失败。${text}`});
      send({type:'local.memory_speech_failed'});
    });
  }
  const watchdog=setInterval(()=>{if(Date.now()-lastHeartbeat>45000)stop();},10000);
  client.on('message',data=> {
    let e; try {e=JSON.parse(data.toString());} catch {fail('本地消息格式错误');return;}
    if(closing) return;
    if(e.type==='timing'){
      const entry=timingDiagnostic(e);if(ready&&entry)log(entry);return;
    }
    if(e.type==='playback'){
      try{if(typeof e.response_id==='string'&&e.response_id.length<=100)history?.playback(e.response_id,e.state);}
      catch{fail('播放状态保存失败，请保留文字历史排查');}
      return;
    }
    if(e.type==='diagnostic') {
      // Fixed structural diagnostics only: no arbitrary error text or audio.
      const safe=v=>typeof v==='string'?v.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100):'unknown';
      log({type:'local.client_error',code:safe(e.code),eventType:safe(e.eventType),
        queuedSeconds:Number.isFinite(e.queuedSeconds)?Math.min(3600,Math.max(0,e.queuedSeconds)):null,
        contextState:safe(e.contextState)});
      return;
    }
    if(e.type==='start' && !upstream) {
      if(!['manual','diagnostic'].includes(e.mode)&&!grants.consume(e.ticket)){fail('未收到有效会话触发，请点击开始聊天或重新实验唤醒');return;}
      log({type:'local.session_start',entryMode:e.mode==='manual'?'manual':e.mode==='diagnostic'?'diagnostic':'wake',
        clientBuild:typeof e.clientBuild==='string'&&/^[a-z0-9_.-]{1,60}$/i.test(e.clientBuild)?e.clientBuild:'unreported'});
      try{
        if(e.mode!=='diagnostic'){
          history=new HistoryRecorder(store,e.mode==='manual'?'manual':'wake');
          memoryTools=new MemoryTools(store,history,{onResult:result=>log({type:'local.memory_tool',...result}),onFeedback:localMemoryFeedback});
          log({type:'local.history',sessionId:history.session.id});
        }
      }catch{fail('无法创建正式文字历史，请检查本地存储');return;}
      upstream=new WebSocket(endpoint,{headers:{'X-Api-Key':config.key},handshakeTimeout:15000,maxPayload:2*1024*1024});
      creationTimer=setTimeout(()=>fail('创建云端会话超时'),20000);
      upstream.on('open',()=>{
        const request=history?memorySession(config.voice):sessionCreate(config.voice);
        log({type:'local.session_config',model:request.session.model,promptVersion:history?MEMORY_PROMPT_ID:ACTIVE_PROMPT_ID,
          promptSha256:createHash('sha256').update(request.session.instructions).digest('hex')});
        cloud(request);
      });
      upstream.on('unexpected-response',(_r,res)=>{res.resume();fail(`云端鉴权/连接失败：HTTP ${res.statusCode}`);});
      upstream.on('error',()=>fail('云端网络连接失败；检查网络与服务状态'));
      upstream.on('close',()=>{
        if(!closing) fail('云端连接已断开，请重新开始');
        clearTimeout(closeTimer); client.close();
      });
      upstream.on('message',raw=> {
        let event;try{event=JSON.parse(raw.toString());}catch{fail('云端返回非 JSON 消息');return;}
        try{
        if(event.type==='error') {
          // Record a code, not an unbounded provider string that could echo config.
          const code=event.error?.code ?? event.code ?? event.status_code ?? 'unknown';
          fail(`云端错误，代码 ${String(code).replace(/[^\w-]/g,'').slice(0,40)}`);return;
        }
        if(event.type==='session.created') {
          clearTimeout(creationTimer);
          if(closing) {cloud({type:'session.close'}); return;}
          ready=true; cloud({type:'input_audio_mute.commit'});
          send({type:'local.ready'}); log({type:event.type});return;
        }
        if(event.type==='session.closed') {
          finishHistory('provider_closed');
          closing=true; ready=false; clearTimeout(creationTimer);
          clearTimeout(closeTimer); clearInterval(watchdog);clearTimeout(cancelTimer);
          send({type:'local.closed'});log({type:event.type,audioFrames});
          upstream.close();client.close();return;
        }
        if(closing) return;
        if(event.type==='conversation.item.input_audio_transcription.started') {
          turnRevision++;memoryOwned=false;memorySpeechAbort?.abort();clearTimeout(memoryFeedbackTimer);mainTurnDone=false;contextFeedback=null;
          paused=false;
          memoryTools?.userStarted();history?.interrupt();
          send({type:'local.user_started'});
          if(guard.active) cancel();
        }
        if(event.type==='conversation.item.input_audio_transcription.completed') {
          const text=event.transcript||event.text||'';
          if(text.trim())history?.user(text);memoryTools?.userCompleted();
          const command=sessionCommand(text);
          if(command==='end'){send({type:'local.end'});log({type:'local.end',reason:'command'});stop('voice_command');return;}
          if(command==='wait'){
            paused=true;if(guard.active)cancel();
            send({type:'local.waiting'});log({type:'local.waiting'});
          }
          if(!command&&history){
            const reply=memoryTools.reply();
            if(reply)localMemoryFeedback(reply);
            else if(explicitRemember(text)){
              memoryOwned=true;
              const revision=turnRevision;
              memoryFeedbackTimer=setTimeout(()=>{if(!closing&&revision===turnRevision){memoryTools.wroteThisTurn=true;localMemoryFeedback({status:'not_called'});}},8000);
            }
          }
        }
        if(event.type==='response.canceled') clearTimeout(cancelTimer);
        if(!guard.accept(event)) return;
        if(memoryOwned&&event.type.startsWith('response.output_'))return;
        if(paused&&event.type.startsWith('response.output_'))return;
        if(event.type==='response.function_call_arguments.done'){
          if(!paused)for(const item of (event.items||[]).slice(0,4)){const result=memoryTools?.handle(item);if(result)cloud(result);}
          return;
        }
        if(event.type==='response.output_text.delta'||event.type==='response.output_text.done'||event.type==='response.output_audio.started')history?.output(event);
        // Never forward a session configuration or auth material to the browser.
        if(event.type.startsWith('response.output_') || event.type.startsWith('conversation.item.input_audio_transcription.') || event.type==='response.canceled') {
          const out={type:event.type,response_id:event.response_id,delta:event.delta,text:event.text,transcript:event.transcript};
          send(out);
          if(event.type!=='response.output_audio.delta') {
            log(out);
          }
        } else if(event.type==='response.done') {
          mainTurnDone=true;syncMemoryWording();
          log({type:event.type,usage:event.response?.usage ?? null});
          send({type:'local.usage',usage:event.response?.usage ?? null});
        }
        }catch{fail('文字历史或工具处理失败，请重新开始并保留日志');}
      });
    } else if(e.type==='stop') stop();
    else if(e.type==='heartbeat') {lastHeartbeat=Date.now();}
    else if(ready) {
      if(e.type==='audio' && typeof e.audio==='string' && /^[A-Za-z0-9+/]{854}==$/.test(e.audio)) {
        // Exactly 320 int16 samples per frame, 20 ms at 16 kHz.
        if(upstream.bufferedAmount>64000) {fail('网络发送积压，停止本轮以避免音频延迟累积');return;}
        audioFrames++;cloud({type:'input_audio_buffer.append',audio:e.audio});
      } else if(e.type==='unmute') cloud({type:'input_audio_unmute.commit'});
      else if(e.type==='mute') cloud({type:'input_audio_mute.commit'});
      else if(e.type==='interrupt'){try{
        memorySpeechAbort?.abort();clearTimeout(memoryFeedbackTimer);contextFeedback=null;
        if(memoryTools)memoryTools.wroteThisTurn=true;
        history?.interrupt();cancel();
      }catch{fail('历史保存失败');}}
      else if(e.type==='greeting') {
        log({type:'local.greeting'});
        cloud({type:'speech_text_buffer.commit',text:'你好，我是 Jarvis。现在可以开始聊天了。'});
      }
    }
  });
  client.on('close',()=>stop('client_disconnected'));
  client.on('error',()=>stop('client_error'));
});
server.on('error',e=>{console.error(e.code||'Server error');process.exitCode=1;});
return {server,get store(){return store;},get worker(){return worker;},start(){return new Promise((resolve,reject)=>{
  // Own the listening port before recovering files; a second startup must not
  // mark the first process's still-active conversations as interrupted.
  const failed=e=>reject(e);server.once('error',failed);
  server.listen(port,'127.0.0.1',()=>{server.off('error',failed);try{initializeMemory();resolve(origin);}catch(error){server.close();reject(error);}});
});},close(){
  worker?.stop();for(const ws of [wss,wakeWss])for(const c of ws.clients)c.close();server.close();
}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=createVoiceServer({config:loadConfig()});
  app.start().then(origin=>console.log(`Jarvis voice: ${origin} (key stays on server)`)).catch(()=>{console.error('语音服务未启动：检查端口占用或本地数据文件；原文件不会自动删除。');process.exitCode=1;});
  const shutdown=()=>{app.close();setTimeout(()=>process.exit(),3000).unref();};
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
