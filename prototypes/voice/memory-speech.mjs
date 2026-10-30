import WebSocket from 'ws';
import {randomUUID} from 'node:crypto';
import {ENDPOINT,sessionCreate} from './config.mjs';

export function memorySpeech(result){
  if(result.status==='pending_confirmation'&&result.current)return `目前记的是“${result.current}”。新说法还待确认，我先不改。`;
  const text={saved:'记住了，已经保存。',already_saved:'这条已经记着了。',kept_existing:'好，保留原来的记录。',deferred_confirmation:'好，先不改，保留原来的记录。',pending_confirmation:'这条仍待确认，原来的记录没有改。',session_only:'好，这次按你的要求来，不改长期偏好。',excluded:'这条不会写入长期记忆。',inactive:'这条是已停用的旧记录，未重新保存。',deferred:'嗯，我们接着聊。',needs_detail:'这条信息比较长，请把要确认的内容简短说一下。',stale:'记录刚有变化，这次先不改，稍后再确认。',failed:'这次没保存成功，先不算记住。',rejected:'这次没有更新记忆，先保留原记录。',not_called:'这次还没有完成保存，先不算记住。'}[result.status];
  return result.status==='confirmation_required'?result.offer.question:text||'这次没有更新记忆。';
}

// A separate text-to-speech connection prevents the conversation model from
// inventing an acknowledgment. Only the host's committed result is synthesized.
// Speech is streamed, abortable, bounded, and never written as a recording.
export function streamMemorySpeech({config,text,responseId,signal,onEvent,onUsage=()=>{},endpoint=ENDPOINT}){
  if(signal?.aborted)return Promise.reject(new Error('speech_aborted'));
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(endpoint,{headers:{'X-Api-Key':config.key},handshakeTimeout:10000,maxPayload:2*1024*1024});
    let settled=false,bytes=0,started=false,done=false;
    const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify({...e,event_id:randomUUID()}));
    const finish=error=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(ws.readyState===WebSocket.OPEN){send({type:'session.close'});ws.close();}else ws.terminate();
      error?reject(new Error(error)):resolve();
    };
    const abort=()=>finish('speech_aborted'),timer=setTimeout(()=>finish('speech_deadline'),30000);
    signal?.addEventListener('abort',abort,{once:true});
    ws.on('open',()=>send(sessionCreate(config.voice)));
    ws.on('unexpected-response',(_r,res)=>{res.resume();finish('speech_connection_failed');});
    ws.on('error',()=>finish('speech_connection_failed'));
    ws.on('close',()=>finish(done?null:'speech_incomplete'));
    ws.on('message',raw=>{
      if(settled)return;
      try{
        const e=JSON.parse(raw);
        if(e.type==='error')return finish('speech_provider_error');
        if(e.type==='session.created'){send({type:'input_audio_mute.commit'});send({type:'speech_text_buffer.commit',text});}
        if(e.type==='response.output_audio.delta'){
          bytes+=Buffer.from(e.delta,'base64').length;if(bytes>2*1024*1024)return finish('speech_audio_budget');
          if(!started){started=true;onEvent({type:'response.output_audio.started',response_id:responseId});}
          onEvent({type:'response.output_audio.delta',response_id:responseId,delta:e.delta});
        }
        if(e.type==='response.done')onUsage(e.response?.usage??null);
        if(e.type==='response.output_audio.done'){
          if(!bytes)return finish('speech_empty');done=true;onEvent({type:'response.output_audio.done',response_id:responseId});send({type:'session.close'});
        }
        if(e.type==='session.closed')finish(done?null:'speech_incomplete');
      }catch{finish('speech_event_failed');}
    });
  });
}
