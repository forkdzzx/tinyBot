// End-to-end local transport + real provider protocol. Synthetic PCM stays in RAM.
import WebSocket from 'ws';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {loadConfig,ENDPOINT,sessionCreate} from './config.mjs';
import {synthesize,pcm16Frame} from '../evaluation/seeduplex.mjs';
const origin='http://127.0.0.1:8766';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function channel(path){
  const ws=new WebSocket(`ws://127.0.0.1:8766/${path}`,{origin});const events=[];
  ws.on('message',raw=>events.push(JSON.parse(raw)));
  ws.on('error',()=>{});
  const wait=async(type,from=0,ms=15000)=>{
    const until=Date.now()+ms;
    while(Date.now()<until){const e=events.slice(from).find(e=>e.type===type);if(e)return e;await sleep(20);}
    throw new Error(`Timeout ${type}; received: ${[...new Set(events.slice(from).map(e=>e.type))].join(',')}`);
  };
  return {ws,events,wait,send:e=>ws.send(JSON.stringify(e))};
}
async function opened(c){while(c.ws.readyState===WebSocket.CONNECTING)await sleep(10);if(c.ws.readyState!==WebSocket.OPEN)throw new Error('Local socket open failed');}
async function feed(c,pcm,binary,until){
  for(let n=0;n<Math.ceil(pcm.length/960)+100;n++){
    if(until?.())return;
    const frame=pcm16Frame(pcm,n);if(binary)c.ws.send(frame);else c.send({type:'audio',audio:frame.toString('base64')});
    await sleep(20);
  }
}
const report={at:new Date().toISOString(),synthetic:true,checks:{}};
let wake,voice,heartbeat;
try{
  const config=loadConfig(),baseline={endpoint:ENDPOINT,request:sessionCreate(config.voice)},audio=new Map();
  for(const text of ['Hi Jarvis','What is your name?','等一下，我想想。','请只说一句你好。','结束聊天。'])audio.set(text,(await synthesize(config.key,baseline,text)).pcm);
  const logDir=new URL('../../runtime/voice/',import.meta.url),before=new Set(await readdir(logDir));
  wake=channel('wake');await wake.wait('wake.ready');wake.send({type:'listen'});await wake.wait('wake.listening');
  await feed(wake,audio.get('What is your name?'),true);
  report.checks.nonWakeDoesNotTrigger=!wake.events.some(e=>e.type==='wake.detected');
  report.checks.standbyCreatesNoCloudSession=(await readdir(logDir)).filter(n=>!before.has(n)).length===0;
  const unauthorized=channel('voice');await opened(unauthorized);unauthorized.send({type:'start'});await unauthorized.wait('local.error');
  const closeDeadline=Date.now()+5000;
  while(unauthorized.ws.readyState!==WebSocket.CLOSED&&Date.now()<closeDeadline)await sleep(20);
  if(unauthorized.ws.readyState!==WebSocket.CLOSED)throw new Error('Rejected socket did not close');
  report.checks.noCloudWithoutWakeGrant=true;
  await feed(wake,audio.get('Hi Jarvis'),true,()=>wake.events.some(e=>e.type==='wake.detected'));
  const hit=await wake.wait('wake.detected');report.checks.actualWake=hit.phrase;
  voice=channel('voice');await opened(voice);voice.send({type:'start',ticket:hit.ticket});
  heartbeat=setInterval(()=>voice.send({type:'heartbeat'}),10000);
  await voice.wait('local.ready');voice.send({type:'unmute'});report.checks.cloudReadyAfterWake=true;
  let from=voice.events.length;
  await feed(voice,audio.get('等一下，我想想。'),false,()=>voice.events.slice(from).some(e=>e.type==='local.waiting'));
  await voice.wait('local.waiting',from);const afterWait=voice.events.length;
  await feed(voice,Buffer.alloc(0),false);await sleep(1000);
  report.checks.waitSuppressesOutput=!voice.events.slice(afterWait).some(e=>e.type.startsWith('response.output_'));
  from=voice.events.length;await feed(voice,audio.get('请只说一句你好。'),false);
  await voice.wait('response.output_text.done',from);report.checks.speechResumesAfterWaiting=true;
  await voice.wait('local.usage',from);
  from=voice.events.length;await feed(voice,audio.get('结束聊天。'),false,()=>voice.events.slice(from).some(e=>e.type==='local.end'));
  await voice.wait('local.end',from);await sleep(3000);report.checks.endClosesCloud=voice.ws.readyState===WebSocket.CLOSED;
  from=wake.events.length;wake.send({type:'listen'});await wake.wait('wake.listening',from);
  await feed(wake,audio.get('Hi Jarvis'),true,()=>wake.events.slice(from).some(e=>e.type==='wake.detected'));
  await wake.wait('wake.detected',from);report.checks.canWakeAgain=true;
  const newLogs=(await readdir(logDir)).filter(n=>!before.has(n));
  let creations=0;
  for(const file of newLogs){const text=await readFile(new URL(file,logDir),'utf8');creations+=text.split('\n').filter(line=>line&&JSON.parse(line).type==='local.session_config').length;}
  report.checks.cloudCreations=creations;
  if(Object.values(report.checks).some(x=>x===false)||creations!==1)process.exitCode=1;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
  clearInterval(heartbeat);voice?.ws.close();wake?.ws.close();
  await writeFile(new URL('../../runtime/wake-integration.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
