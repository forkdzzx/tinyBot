// Local integration only: fake upstream, no microphone and no cloud credentials.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket,{WebSocketServer} from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
const root=mkdtempSync(join(tmpdir(),'jarvis-server-'));
const upstream=new WebSocketServer({host:'127.0.0.1',port:8793});
const app=createVoiceServer({config:{key:'test-only',voice:'test-only'},endpoint:'ws://127.0.0.1:8793',port:8792,memoryRoot:root,withWake:false,extract:async()=>({result:{summary:'',memories:[]},usage:{}})});
let phrase='';
upstream.on('connection',ws=>ws.on('message',raw=>{
  const e=JSON.parse(raw),send=e=>ws.send(JSON.stringify(e));
  if(e.type==='session.create')send({type:'session.created'});
  if(e.type==='input_audio_unmute.commit'){
    send({type:'conversation.item.input_audio_transcription.started'});
    send({type:'conversation.item.input_audio_transcription.completed',text:phrase});
  }
  if(e.type==='session.close')send({type:'session.closed'});
}));
async function until(check){for(let i=0;i<200;i++){if(check())return;await delay(10);}throw new Error('local integration deadline');}
const results=[];
try{
  await app.start();
  for(const text of ['我又有点不想聊天了，先结束吧。','OK，可以结束。','不要结束聊天']){
    phrase=text;const events=[];
    const ws=new WebSocket('ws://127.0.0.1:8792/voice',{origin:'http://127.0.0.1:8792'});
    const send=e=>ws.send(JSON.stringify(e));ws.on('message',raw=>events.push(JSON.parse(raw)));
    await until(()=>ws.readyState===WebSocket.OPEN);send({type:'start',mode:'manual'});
    await until(()=>events.some(e=>e.type==='local.ready'));
    send({type:'timing',stage:'asr_final',turn:1,asrWindowMs:100,lastEnergyToAsrMs:50,audio:'discard'});
    send({type:'unmute'});
    if(text==='不要结束聊天'){
      await until(()=>events.some(e=>e.type==='conversation.item.input_audio_transcription.completed'));
      assert.ok(!events.some(e=>e.type==='local.end'));send({type:'stop'});
    }else await until(()=>events.some(e=>e.type==='local.end'));
    await until(()=>ws.readyState===WebSocket.CLOSED);
    assert.ok(!events.some(e=>e.type==='local.error'));
    const last=readdirSync(join(root,'history')).map(f=>JSON.parse(readFileSync(join(root,'history',f)))).find(s=>s.entries.some(e=>e.text===text));
    assert.equal(last.status,'ended');assert.equal(last.endReason,text==='不要结束聊天'?'client_end':'voice_command');
    results.push({text,endReason:last.endReason,closed:true});
  }
  console.log(JSON.stringify({localOnly:true,results},null,2));
}finally{
  app.close();for(const ws of upstream.clients)ws.terminate();upstream.close();await delay(50);rmSync(root,{recursive:true,force:true});
}
