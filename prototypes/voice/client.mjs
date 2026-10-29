import { PCMPlayer,PlaybackReceipts } from './playback.mjs';
import { SessionLifecycle } from './lifecycle.mjs';
import { TurnTiming } from './timing.mjs';
const el=id=>document.getElementById(id);
let socket,wakeSocket,stream,inputContext,outputContext,capture,player;
let generation=0,voiceGeneration=0,phase='disabled',ready=false,diagnostic=false;
let wakeOnly=false;
let pendingAudio=false,userText='',assistantText='',asrEnded=null,firstAudio=true;
let volumeFrames=0,lastBarge=0,prebuffer=[],captureActive=false;
let connectTimeout,playbackTimer,closeTimer,heartbeat,drowsyTimer,audioPump;
const playbackReceipts=new PlaybackReceipts((id,state)=>send({type:'playback',response_id:id,state}));
const turnTiming=new TurnTiming();
function reportTiming(event){
  if(event)send({type:'timing',captureQueueMs:prebuffer.length*20,playbackQueueMs:(player?.queuedSeconds||0)*1000,
    outputBaseLatencyMs:Number.isFinite(outputContext?.baseLatency)?outputContext.baseLatency*1000:null,contextState:outputContext?.state,...event});
}
const lifecycle=new SessionLifecycle(reason=>endChat(reason==='wait_timeout'?'思考等待到期':'本次会话已结束'));
const status=text=>{el('status').textContent=text;};
const face=state=>{el('face').dataset.state=state;};
function log(type){el('events').textContent=`${new Date().toLocaleTimeString()} ${type}\n`+el('events').textContent.slice(0,6000);}
function send(e){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(e));}
function wakeSend(e){if(wakeSocket?.readyState===WebSocket.OPEN)wakeSocket.send(JSON.stringify(e));}
function buttons(){
  const disabled=phase==='disabled';
  for(const id of ['start','direct','greet','wake-test'])el(id).disabled=!disabled;
  el('stop').disabled=disabled;el('end').disabled=!['connecting','chat'].includes(phase);
  el('interrupt').disabled=!ready;
}
function clearAudio(){playbackReceipts.interrupt();player?.clear();clearTimeout(playbackTimer);}
function barge(){
  if(!ready)return;
  clearAudio();pendingAudio=true;assistantText='';el('assistant').textContent='';
  lastBarge=performance.now();lifecycle.interrupted();face('listening');send({type:'interrupt'});
}
function releaseAudio(){
  stream?.getTracks().forEach(t=>t.stop());stream=null;
  capture?.disconnect();capture=null;
  inputContext?.close().catch(()=>{});inputContext=null;
  clearAudio();player=null;outputContext?.close().catch(()=>{});outputContext=null;
}
function disable(message='交互已关闭 · 麦克风关闭'){
  generation++;voiceGeneration++;phase='disabled';ready=false;captureActive=false;prebuffer=[];
  lifecycle.dispose();clearTimeout(connectTimeout);clearTimeout(closeTimer);clearTimeout(drowsyTimer);clearInterval(heartbeat);clearInterval(audioPump);
  clearAudio();
  send({type:'stop'});
  const old=socket;socket=null;
  if(old){old.onmessage=null;old.onclose=null;old.onerror=null;old.onopen=null;old.close();}
  if(wakeSocket){wakeSocket.onmessage=null;wakeSocket.onerror=null;wakeSocket.onclose=null;wakeSocket.close();wakeSocket=null;}
  releaseAudio();face('idle');status(message);buttons();
  el('wake-input').textContent='';
}
function standby(message=''){
  lifecycle.dispose();ready=false;prebuffer=[];clearAudio();pendingAudio=false;
  if(!wakeSocket)return disable(`${message||'本次会话已结束'} · 麦克风关闭，可点击开始聊天`);
  phase='arming';buttons();face('idle');status(`${message?message+' · ':''}正在恢复本地唤醒`);
  wakeSend({type:'listen'});
}
function finishChat(message){
  clearTimeout(connectTimeout);clearTimeout(closeTimer);clearInterval(heartbeat);clearInterval(audioPump);voiceGeneration++;socket=null;
  standby(message);
}
function endChat(message='本次会话已结束'){
  if(!socket)return;
  if(phase==='ending')return;
  phase='ending';ready=false;prebuffer=[];clearInterval(audioPump);lifecycle.dispose();clearAudio();face('idle');buttons();
  clearTimeout(connectTimeout);status(`${message} · 正在断开云端`);send({type:'stop'});
  const old=socket;
  old.onclose=()=>{if(socket===old)finishChat(message);};
  closeTimer=setTimeout(()=>{if(socket===old)old.close();},3000);
}
function play(delta){
  if(pendingAudio||lifecycle.phase==='waiting'||!outputContext||typeof delta!=='string')return;
  const playbackQueueMs=player.queuedSeconds*1000;
  player.enqueue(delta,{onEnded:playbackReceipts.queued()});lifecycle.outputStarted();face('speaking');
  const timing=turnTiming.firstAudio(performance.now());if(timing)reportTiming({...timing,playbackQueueMs});
  if(firstAudio){firstAudio=false;if(asrEnded!==null)el('metrics').textContent=`识别结束至首音频排程约 ${Math.round(performance.now()-asrEnded)} ms（非端到端验收延迟）`;}
}
function playbackFinished(){
  clearTimeout(playbackTimer);
  // AudioBufferSource.onended is authoritative: generation can finish far ahead of playback.
  if(player?.active){playbackTimer=setTimeout(playbackFinished,50);return;}
  lifecycle.playbackEnded();
  if(lifecycle.phase!=='waiting')face('listening');
  if(diagnostic&&!captureActive)endChat('问候测试完成 · 麦克风未开启');
}
function beginCloud(ticket=null){
  if(socket||phase==='disabled')return;
  clearTimeout(drowsyTimer);phase='connecting';ready=false;prebuffer=[];pendingAudio=false;
  userText='';assistantText='';asrEnded=null;firstAudio=true;
  turnTiming.reset();
  el('user').textContent='';el('assistant').textContent='';el('metrics').textContent='';
  wakeSend({type:'pause'});status(wakeSocket?'实验唤醒成功 · 连接豆包中':'连接豆包中 · 请稍候');face('thinking');buttons();
  const run=++voiceGeneration;
  socket=new WebSocket(`ws://${location.host}/voice`);
  connectTimeout=setTimeout(()=>endChat('云端连接超时'),22000);
  socket.onopen=()=>{
    send(diagnostic?{type:'start',mode:captureActive?'manual':'diagnostic'}:{type:'start',ticket});
    heartbeat=setInterval(()=>send({type:'heartbeat'}),10000);
  };
  socket.onerror=()=>endChat('云端代理连接失败');
  socket.onclose=()=>{if(run===voiceGeneration)finishChat('云端已断开');};
  socket.onmessage=({data})=>{
    if(run!==voiceGeneration)return;
    let eventType='unknown';
    try{
      const e=JSON.parse(data);eventType=e.type;
      if(e.type!=='response.output_audio.delta')log(e.type);
      if(e.type==='local.closed'){socket.close();return;}
      if(e.type==='local.error'){endChat(e.message);return;}
      if(phase==='ending')return;
      if(e.type==='local.ready'){
        clearTimeout(connectTimeout);ready=true;phase='chat';lifecycle.ready();buttons();face('listening');
        status(captureActive?'会话中 · 可以直接讲话':'问候测试 · 麦克风关闭');
        send({type:captureActive?'unmute':'greeting'});
        // Drain post-wake connection buffering at at most 2x realtime, rather than
        // dumping seconds of PCM into the cloud socket in one event-loop tick.
        audioPump=setInterval(()=>{
          if(!ready||!prebuffer.length)return;
          if(socket.bufferedAmount>64000)return endChat('音频发送积压');
          send({type:'audio',audio:prebuffer.shift()});
        },10);
      }else if(e.type==='local.end'){endChat('按语音要求结束聊天');}
      else if(e.type==='local.waiting'){
        lifecycle.inputCompleted('等一下，我想想');clearAudio();pendingAudio=true;face('listening');
        status('安静等待 · 最多 10 分钟，你开口后继续');
      }else if(e.type==='local.notice')status(e.message);
      else if(e.type==='local.interrupted'){clearAudio();pendingAudio=true;assistantText='';el('assistant').textContent='';lifecycle.interrupted();}
      else if(e.type==='response.canceled')pendingAudio=false;
      else if(e.type==='local.user_started'){
        turnTiming.userStarted(performance.now());
        clearAudio();lifecycle.userStarted();pendingAudio=false;userText='';assistantText='';firstAudio=true;
        status('会话中 · 正在听');face('listening');el('user').textContent='';el('assistant').textContent='';
      }else if(e.type==='conversation.item.input_audio_transcription.delta'){
        userText=e.delta||e.text||'';el('user').textContent=userText;
      }else if(e.type==='conversation.item.input_audio_transcription.completed'){
        const text=e.transcript||e.text||userText;el('user').textContent=text;
        const command=lifecycle.inputCompleted(text);asrEnded=performance.now();
        reportTiming(turnTiming.inputCompleted(asrEnded));
        if(command==='wait'){clearAudio();face('listening');status('安静等待 · 最多 10 分钟，你开口后继续');}
        else if(!command)face('thinking');
      }else if(e.type==='response.output_text.delta'&&!pendingAudio&&lifecycle.phase!=='waiting'){
        assistantText+=e.delta||e.text||'';el('assistant').textContent=assistantText;
      }else if(e.type==='response.output_text.done'&&!pendingAudio&&lifecycle.phase!=='waiting'){
        el('assistant').textContent=e.text||assistantText;
      }else if(e.type==='response.output_audio.started')playbackReceipts.stream(e.response_id);
      else if(e.type==='response.output_audio.delta')play(e.delta);
      else if(e.type==='response.output_audio.done'){playbackReceipts.finish(e.response_id);playbackFinished();}
    }catch(error){
      const code=error.code||error.name||'EVENT_ERROR';
      send({type:'diagnostic',code,eventType,queuedSeconds:player?.queuedSeconds||0,contextState:outputContext?.state});
      console.error('Jarvis event failure',eventType,code);endChat(`音频或事件处理失败（${code}）`);
    }
  };
}
async function enable(withMic=true,withWake=true,onlyWake=false){
  if(phase!=='disabled')return;
  const run=++generation;phase='arming';diagnostic=!withWake;wakeOnly=onlyWake;buttons();
  try{
    outputContext=new AudioContext({sampleRate:24000});await outputContext.resume();
    if(run!==generation)return;player=new PCMPlayer(outputContext);
    if(withMic){
      status('等待麦克风授权');
      const obtained=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      if(run!==generation){obtained.getTracks().forEach(t=>t.stop());return;}
      stream=obtained;captureActive=true;inputContext=new AudioContext({sampleRate:16000});
      if(inputContext.sampleRate!==16000)throw new Error('UnsupportedSampleRate');
      await inputContext.audioWorklet.addModule('/capture.mjs');if(run!==generation)return;
      capture=new AudioWorkletNode(inputContext,'jarvis-capture');
      inputContext.createMediaStreamSource(stream).connect(capture);capture.connect(inputContext.destination);
      capture.port.onmessage=({data})=>{
        if(run!==generation)return;
        const bytes=new Uint8Array(data.samples.buffer);
        if(phase==='standby'){
          if(wakeSocket?.readyState===WebSocket.OPEN){
            if(wakeSocket.bufferedAmount>32000)return disable('本地唤醒音频积压 · 麦克风关闭');
            wakeSocket.send(bytes);
          }
          return;
        }
        if(!['connecting','chat'].includes(phase))return;
        let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
        const audio=btoa(binary);
        // Only post-detection audio; never upload preceding standby audio.
        if(prebuffer.length>=400)return endChat('连接或音频处理等待过长，请重新开始聊天');
        prebuffer.push(audio);if(!ready)return;
        turnTiming.sample(data.rms,performance.now(),player?.active);
        if(data.rms>.025)lifecycle.activity();
        volumeFrames=player?.active&&data.rms>.04?volumeFrames+1:0;
        if(el('vad').checked&&volumeFrames>=5&&performance.now()-lastBarge>800){volumeFrames=0;barge();}
      };
      await inputContext.resume();
    }
    if(run!==generation)return;
    if(!withWake){beginCloud();return;}
    status('加载本地唤醒 · 尚未连接云端');
    wakeSocket=new WebSocket(`ws://${location.host}/wake`);
    wakeSocket.onerror=()=>disable('本地唤醒服务连接失败 · 麦克风关闭');
    wakeSocket.onclose=()=>{if(run===generation)disable('本地唤醒连接已关闭 · 麦克风关闭');};
    wakeSocket.onmessage=({data})=>{
      if(run!==generation)return;
      try{
        const e=JSON.parse(data);if(e.type!=='wake.activity')log(e.type);
        if(e.type==='wake.error')return disable(e.message);
        if(e.type==='wake.ready'){
          const captureState=()=>wakeSend({type:'capture_state',contextState:inputContext?.state,sampleRate:inputContext?.sampleRate,
            trackLive:stream?.getAudioTracks()[0]?.readyState==='live',trackMuted:stream?.getAudioTracks()[0]?.muted===true});
          captureState();if(inputContext)inputContext.onstatechange=captureState;standby();
        }
        else if(e.type==='wake.activity'){
          const level=e.frames===0?'未收到音频':e.peak<.003?'输入接近静音':e.audibleFrames===0?'输入声音较弱':'收到声音';
          el('wake-input').textContent=`本地收音：${level}；${e.pending>50?'识别处理积压':'识别服务运行中'}。只记录音量统计，不保存录音。`;
        }
        else if(e.type==='wake.listening'){
          phase='standby';status(wakeOnly?'仅测试 Hi Jarvis · 不连接云端':'实验待机 · 说 Hi Jarvis 唤醒 · 声音不上传云端');face('idle');buttons();
          clearTimeout(drowsyTimer);drowsyTimer=setTimeout(()=>{if(phase==='standby')face('drowsy');},300000);
        }else if(e.type==='wake.detected'&&phase==='standby'){
          log(`识别到：${e.phrase}`);
          if(wakeOnly){phase='arming';wakeSend({type:'listen'});}else beginCloud(e.ticket);
        }
      }catch{disable('本地唤醒消息异常 · 麦克风关闭');}
    };
  }catch(error){
    const hint={NotFoundError:'未找到可用麦克风',NotAllowedError:'麦克风授权未允许',NotReadableError:'麦克风无法读取'}[error.name]||'无法初始化音频设备';
    if(run===generation)disable(`${hint} · 麦克风关闭`);
  }
}
el('start').onclick=()=>enable();
el('direct').onclick=()=>enable(true,false);
el('greet').onclick=()=>enable(false,false);
el('wake-test').onclick=()=>enable(true,true,true);
el('interrupt').onclick=barge;
el('end').onclick=()=>endChat();
el('stop').onclick=()=>disable();
window.addEventListener('pagehide',()=>disable());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase!=='disabled')disable('页面离开前台 · 麦克风关闭');});
