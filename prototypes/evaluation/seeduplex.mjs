import WebSocket from 'ws';
import {randomUUID} from 'node:crypto';

// All errors are fixed labels/codes: no credentials, headers, or raw audio in logs.
function connection(key,baseline,seconds,handler){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(baseline.endpoint,{headers:{'X-Api-Key':key},handshakeTimeout:10000,maxPayload:2*1024*1024});
    let settled=false,cleanup=()=>{};
    const finish=(error,value)=>{
      if(settled)return;settled=true;clearTimeout(timer);cleanup();
      if(ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({type:'session.close'}));ws.close();}
      else ws.terminate();
      if(error)reject(error);else resolve(value);
    };
    const fail=reason=>finish(new Error(reason));
    const send=e=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify({...e,event_id:randomUUID()}));
    const timer=setTimeout(()=>fail('session deadline'),seconds*1000);
    const lifecycle=handler({send,finish:value=>finish(null,value),fail});cleanup=lifecycle.cleanup||cleanup;
    ws.on('upgrade',response=>lifecycle.logId?.(response.headers['x-tt-logid']));
    ws.on('unexpected-response',(_req,res)=>{res.resume();fail(`HTTP ${res.statusCode}`);});
    ws.on('error',()=>fail('network failure'));
    ws.on('close',()=>{if(!settled)fail('connection closed without session.closed');});
    ws.on('open',()=>send(baseline.request));
    ws.on('message',raw=>{
      if(settled)return;
      try{
        const e=JSON.parse(raw);
        if(e.type==='error')return fail(`provider error ${String(e.error?.code??e.code??'unknown').replace(/[^\w-]/g,'').slice(0,50)}`);
        lifecycle.event(e);
      }catch{fail('event processing failure');}
    });
  });
}

export async function synthesize(key,baseline,text){
  const diagnostics={audioBytes:0,logId:null,events:{}};
  try{return await connection(key,baseline,30,({send,finish,fail})=>{
    const chunks=[];let bytes=0,done=false;const usage=[];
    return {logId(id){diagnostics.logId=id;},event(e){
      const type=String(e.type).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80);
      diagnostics.events[type]=(diagnostics.events[type]||0)+1;
      if(e.type==='session.created'){send({type:'input_audio_mute.commit'});send({type:'speech_text_buffer.commit',text});}
      if(e.type==='response.output_audio.delta'){
        const chunk=Buffer.from(e.delta,'base64');bytes+=chunk.length;
        diagnostics.audioBytes=bytes;
        if(bytes>2*1024*1024)return fail('synthesis audio budget');chunks.push(chunk);
      }
      if(e.type==='response.done')usage.push(e.response?.usage??null);
      if(e.type==='response.output_audio.done'){done=true;send({type:'session.close'});}
      if(e.type==='session.closed')done&&bytes?finish({pcm:Buffer.concat(chunks),usage}):fail('empty synthesis');
    }};
  });}catch(error){error.diagnostics=diagnostics;throw error;}
}

export function pcm16Frame(pcm24,frame){
  const bytes=Buffer.alloc(640);
  for(let i=0;i<320;i++){
    const position=(frame*320+i)*1.5,index=Math.floor(position);
    if(index*2+1<pcm24.length){
      const left=pcm24.readInt16LE(index*2),right=index*2+3<pcm24.length?pcm24.readInt16LE(index*2+2):left;
      bytes.writeInt16LE(Math.round(left+(right-left)*(position-index)),i*2);
    }
  }
  return bytes;
}

export async function converse(key,baseline,questions,audio){
  const report={turns:[],histories:[],logId:null,sessionId:null,eventCounts:{}};
  try{return await connection(key,baseline,120,({send,finish,fail})=>{
    const started=performance.now();
    let index=-1,upload,closing=false,retrieving=false,totalFrames=0;
    const ms=()=>Math.round(performance.now()-started);
    function next(){
      clearInterval(upload);index++;
      if(index===questions.length){closing=true;send({type:'session.close'});return;}
      const pcm=audio.get(questions[index]).pcm;let frame=0;
      const turn={question:questions[index],recognized:'',answer:'',inputStartedMs:ms(),inputEndedMs:null,asrCompletedMs:null,firstAudioMs:null,audioBytes:0,usage:null};
      report.turns.push(turn);send({type:'input_audio_unmute.commit'});
      upload=setInterval(()=>{
        send({type:'input_audio_buffer.append',audio:pcm16Frame(pcm,frame).toString('base64')});
        totalFrames++;frame++;
        if(turn.inputEndedMs===null&&frame*320*1.5>=pcm.length/2)turn.inputEndedMs=ms();
        if(frame>3000)fail('turn input budget');
      },20);
    }
    return {
      cleanup(){clearInterval(upload);},
      logId(id){report.logId=id;},
      event(e){
        const type=String(e.type).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80);
        report.eventCounts[type]=(report.eventCounts[type]||0)+1;
        if(e.type==='session.created'){report.sessionId=e.session?.id;next();return;}
        if(e.type==='session.closed'){
          if(!closing)return fail('early session.closed');
          report.uploadedSeconds=totalFrames*.02;finish(report);return;
        }
        const turn=report.turns[index];
        if(e.type==='conversation.item.input_audio_transcription.completed'){turn.recognized=e.text??'';turn.asrCompletedMs=ms();}
        if(e.type==='response.output_text.done')turn.answer=e.text??'';
        if(e.type==='response.output_audio.delta'){turn.firstAudioMs??=ms();turn.audioBytes+=Buffer.from(e.delta,'base64').length;}
        if(e.type==='response.done'&&!retrieving){
          turn.usage=e.response?.usage??null;clearInterval(upload);send({type:'input_audio_mute.commit'});
          retrieving=true;send({type:'conversation.item.retrieve'});
        }
        if(e.type==='conversation.item.retrieved'&&retrieving){
          report.histories.push({afterTurn:index+1,items:(e.items||[]).map(item=>({id:item.id,role:item.role,text:(item.content||[]).map(c=>c.text||'').join('')}))});
          retrieving=false;next();
        }
      }
    };
  });}catch(error){error.partial=report;throw error;}
}
