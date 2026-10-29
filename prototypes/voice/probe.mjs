// A bounded cloud smoke test. Never opens the microphone or saves audio.
import WebSocket from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ENDPOINT, loadConfig, sessionCreate } from './config.mjs';

const config = loadConfig();
const report = { date: new Date().toISOString(), model: '1.2.6.1', events: [], created: false, closed: false, audioBytes: 0 };
const started = performance.now();
const greeting = process.argv.includes('--greeting');
const loopback = process.argv.includes('--loopback');
const questionIndex=process.argv.indexOf('--question');
const question=questionIndex>=0?process.argv[questionIndex+1]:'请用一句话解释什么是变量。';
let firstAnswerAt=null, answerBytes=0;
report.playback={peakQueuedSeconds:0,oddChunks:0,answerSeconds:0};
let audio = [], inputSent = false, outputComplete = false, uploadTimer;
const ws = new WebSocket(ENDPOINT, {
  headers: { 'X-Api-Key': config.key }, handshakeTimeout: 15000, maxPayload: 2 * 1024 * 1024,
});
const send = event => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(event));
let finished = false;
let closing = false;
function finish(ok, reason) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  clearInterval(uploadTimer);
  report.ok = ok;
  if (reason) report.reason = String(reason).replaceAll(config.key, '[redacted]').slice(0,250);
  mkdirSync(new URL('../../runtime', import.meta.url), {recursive:true,mode:0o700});
  writeFileSync(new URL('../../runtime/voice-probe.json', import.meta.url),JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify(report,null,2));
  ws.terminate();
  process.exitCode = ok ? 0 : 1;
}
function closeSession() {
  if (closing) return;
  closing = true;
  send({type:'session.close'});
}
const deadline = setTimeout(()=>finish(false,'probe deadline exceeded'),loopback?45000:30000);
ws.on('open',()=>send(sessionCreate(config.voice)));
ws.on('unexpected-response',(_request,response)=> {
  response.resume();
  finish(false,`HTTP ${response.statusCode}`);
});
ws.on('error',error=>finish(false,error.code || error.message));
ws.on('close',()=> { if (!finished) finish(false,'connection closed before session.closed'); });
ws.on('message',bytes=> {
  let e;
  try { e=JSON.parse(bytes.toString()); } catch { finish(false,'non-JSON response'); return; }
  if (e.type !== 'response.output_audio.delta') report.events.push({type:e.type,ms:Math.round(performance.now()-started),fields:Object.keys(e),item_id:e.item_id,response_id:e.response_id});
  if(e.type==='error') { finish(false,e.error?.message || e.message || 'provider error'); return; }
  if(e.type==='session.created') {
    report.created=true;
    send({type:'input_audio_mute.commit'});
    if(greeting || loopback) send({type:'speech_text_buffer.commit',text:loopback?question:'你好，我是 Jarvis。语音连接测试成功。'});
    else closeSession();
  }
  if(e.type==='response.output_audio.delta') {
    report.audioBytes += typeof e.delta==='string' ? Buffer.from(e.delta,'base64').length : 0;
    if(!report.audioDeltaFields) report.audioDeltaFields=Object.keys(e);
    if(loopback && !inputSent) audio.push(Buffer.from(e.delta,'base64'));
    if(loopback && inputSent) {
      const length=Buffer.from(e.delta,'base64').length;
      if(length%2)report.playback.oddChunks++;
      firstAnswerAt ??= performance.now();answerBytes+=length;
      report.playback.answerSeconds=answerBytes/48000;
      report.playback.peakQueuedSeconds=Math.max(report.playback.peakQueuedSeconds,answerBytes/48000-(performance.now()-firstAnswerAt)/1000);
    }
  }
  if(e.type?.startsWith('conversation.item.input_audio_transcription.')) report.events.at(-1).sample = {delta:e.delta,text:e.text,transcript:e.transcript};
  if(e.type==='response.output_audio.done' && loopback && !inputSent) {
    inputSent=true;
    const pcm=Buffer.concat(audio); audio=[];
    const samples=Math.floor(pcm.length/2/1.5);
    const frames=Math.ceil(samples/320)+300; // Six seconds of silence for end-of-turn.
    let frame=0;
    send({type:'input_audio_unmute.commit'});
    uploadTimer=setInterval(()=>{
      const bytes=Buffer.alloc(640);
      for(let i=0;i<320;i++) {
        const position=(frame*320+i)*1.5, index=Math.floor(position);
        if(index*2+3<pcm.length) {
          const left=pcm.readInt16LE(index*2), right=pcm.readInt16LE(index*2+2);
          bytes.writeInt16LE(Math.round(left+(right-left)*(position-index)),i*2);
        }
      }
      send({type:'input_audio_buffer.append',audio:bytes.toString('base64')});
      if(++frame>=frames) {clearInterval(uploadTimer);send({type:'input_audio_mute.commit'});}
    },20);
  } else if(e.type==='response.output_audio.done' && loopback && inputSent) {
    outputComplete=true; clearInterval(uploadTimer);closeSession();
  } else if(e.type==='response.output_audio.done' && greeting) closeSession();
  if(e.type==='session.closed') {
    report.closed=true;
    finish(report.created && (!greeting || report.audioBytes > 0) && (!loopback || outputComplete));
  }
});
