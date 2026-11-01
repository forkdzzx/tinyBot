import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket,{WebSocketServer} from 'ws';
import {createVoiceServer} from '../voice/server.mjs';
import {HistoryRecorder,MemoryStore} from '../memory/store.mjs';

// All model, extraction and speech calls stay within this process. The local
// WebSocket pair exercises the real host lifecycle and playback receipts.
const root=mkdtempSync(join(tmpdir(),'jarvis-learning-flow-'));
const proxyPort=8788,providerPort=8789;
const audio=Buffer.alloc(960).toString('base64');
const provider=new WebSocketServer({host:'127.0.0.1',port:providerPort});
let remote,app,ws,events=[],sequence=0,holdNext=false,releaseExtraction=null;
const extracted=[],speeches=[],receivedPlayback=new Set();
provider.on('connection',socket=>{
  remote=socket;
  socket.on('message',raw=>{
    const event=JSON.parse(raw);
    if(event.type==='session.create')socket.send(JSON.stringify({type:'session.created'}));
    if(event.type==='session.close')socket.send(JSON.stringify({type:'session.closed'}));
    if(event.type==='response.cancel')socket.send(JSON.stringify({type:'response.canceled'}));
  });
});
const emit=event=>remote.send(JSON.stringify(event));
async function wait(check,label,ms=3000){
  const until=Date.now()+ms;
  while(Date.now()<until){if(check())return;await delay(5);}
  throw new Error(`learning_flow_deadline_${label}`);
}
function history(){
  const files=readdirSync(app.store.historyDir).filter(file=>file.endsWith('.json'));
  assert.equal(files.length,1);
  return app.store.readSession(files[0].slice(0,-5));
}
const summaries=(from=0)=>events.slice(from).filter(event=>event.type==='local.memory_result'&&event.status==='learning_summary');
const learningAudio=(from=0)=>events.slice(from).filter(event=>event.type==='response.output_audio.started'&&event.response_id?.startsWith('learning-'));
async function boot(name,learningWaitMs){
  events=[];holdNext=false;releaseExtraction=null;receivedPlayback.clear();
  app=createVoiceServer({
    config:{key:'mock-only',voice:'mock-only'},endpoint:`ws://127.0.0.1:${providerPort}`,
    port:proxyPort,memoryRoot:join(root,name),withWake:false,learningWaitMs,
    extract:async()=>({result:{summary:'',memories:[]}}),
    extractPractice:async entries=>{
      extracted.push(structuredClone(entries));
      const source=entries.find(entry=>entry.text.includes('breakfast'));
      const result={vocabulary:source?[{word:'breakfast',meaning:'早餐',entryId:source.id,quote:'breakfast'}]:[],corrections:[]};
      if(holdNext){holdNext=false;await new Promise(resolve=>{releaseExtraction=resolve;});}
      return {result,usage:{total_tokens:10}};
    },
    speak:async({text,responseId,onEvent})=>{
      speeches.push({text,responseId});
      for(const event of [
        {type:'response.output_audio.started'},
        {type:'response.output_audio.delta',delta:audio},
        {type:'response.output_audio.done'}
      ])onEvent({...event,response_id:responseId});
    }
  });
  await app.start();
  ws=new WebSocket(`ws://127.0.0.1:${proxyPort}/voice`,{origin:`http://127.0.0.1:${proxyPort}`});
  ws.on('message',raw=>{
    const event=JSON.parse(raw);events.push(event);
    if(event.type==='response.output_audio.done'&&/^(mode-|learning-)/.test(event.response_id??'')){
      ws.send(JSON.stringify({type:'playback',response_id:event.response_id,state:'completed'}));
      receivedPlayback.add(event.response_id);
    }
  });
  await wait(()=>ws.readyState===WebSocket.OPEN,'client_open');
  ws.send(JSON.stringify({type:'start',mode:'manual'}));
  await wait(()=>events.some(event=>event.type==='local.ready'),'ready');
}
async function input(text){
  const from=events.length;
  emit({type:'conversation.item.input_audio_transcription.started'});
  emit({type:'conversation.item.input_audio_transcription.completed',text});
  await wait(()=>events.slice(from).some(event=>event.type==='conversation.item.input_audio_transcription.completed'&&event.text===text),'input');
  return from;
}
async function answer(text,{played=true}={}){
  const id=`mock-answer-${++sequence}`,from=events.length;
  for(const event of [
    {type:'response.output_text.done',text},
    {type:'response.output_audio.started'},
    {type:'response.output_audio.delta',delta:audio},
    {type:'response.output_audio.done'},
    {type:'response.done'}
  ])emit({...event,response_id:id});
  await wait(()=>events.slice(from).some(event=>event.type==='response.output_audio.done'&&event.response_id===id),'answer');
  if(played){
    ws.send(JSON.stringify({type:'playback',response_id:id,state:'completed'}));
    receivedPlayback.add(id);
    await wait(()=>history().entries.find(entry=>entry.responseId===id)?.playback==='completed','playback_receipt');
  }
  return id;
}
async function enterEnglish(){
  const from=await input('陪我练英语');
  await wait(()=>events.slice(from).some(event=>event.type==='response.output_audio.done'),'mode_notice');
  assert.equal(app.modes.current,'english');
}
async function completedSegment(index){
  await wait(()=>app.learningArchive.state.segments[index]?.status==='done',`archive_${index}`);
  return app.learningArchive.state.segments[index];
}
async function finishApp(){
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({type:'stop'}));await wait(()=>ws.readyState===WebSocket.CLOSED,'client_close');}
  if(app){const closed=new Promise(resolve=>app.server.once('close',resolve));app.close();await closed;app=null;}
}

try{
  await boot('main',2000);
  await input('I want to say some English.');
  await answer('This daily answer is also outside the exercise.');
  assert.equal(app.modes.current,'daily');
  const englishRequest=await input('I just want the English practice, oral practice.');
  await wait(()=>events.slice(englishRequest).some(event=>event.type==='response.output_audio.done'),'english_request_notice');
  assert.equal(app.modes.current,'english');
  await input('I eat breakfast at seven.');
  const playedId=await answer('Breakfast is the first meal of the day.');
  await input('I like oatmeal.');
  const unplayedId=await answer('Try grapefruit for breakfast.',{played:false});
  const explicitFrom=await input('今天先练到这里吧。');
  const first=await completedSegment(0);
  await wait(()=>learningAudio(explicitFrom).length===1,'explicit_summary');
  assert.equal(app.modes.current,'daily');
  assert.equal(ws.readyState,WebSocket.OPEN);
  assert.equal(summaries(explicitFrom).length,1);
  assert.match(summaries(explicitFrom)[0].message,/breakfast/);
  assert.match(summaries(explicitFrom)[0].message,/已保存/);
  assert.equal(first.reason,'explicit_end');
  assert.deepEqual(first.entries.map(entry=>[entry.role,entry.text]),[
    ['user','I eat breakfast at seven.'],
    ['assistant','Breakfast is the first meal of the day.'],
    ['user','I like oatmeal.']
  ]);
  assert.equal(history().entries.find(entry=>entry.responseId===playedId).playback,'completed');
  assert.equal(history().entries.find(entry=>entry.responseId===unplayedId).playback,'interrupted');
  assert.ok(receivedPlayback.has(playedId)&&!receivedPlayback.has(unplayedId));
  assert.equal(history().entries.filter(entry=>entry.source==='local_learning').length,1);

  await enterEnglish();
  await input('My favorite fruit is orange.');
  await answer('Orange is a fruit.');
  const exitFrom=await input('不练英语，只是聊天');
  const second=await completedSegment(1);
  assert.equal(app.modes.current,'daily');
  assert.equal(second.reason,'mode_exit');
  assert.deepEqual(second.entries.map(entry=>entry.text),['My favorite fruit is orange.','Orange is a fruit.']);
  await delay(40);
  assert.equal(summaries(exitFrom).length,0);
  assert.equal(learningAudio(exitFrom).length,0);

  await enterEnglish();
  await input('I enjoy a morning walk.');
  await answer('A morning walk sounds relaxing.');
  holdNext=true;
  const staleFrom=await input('今天练到这里');
  await wait(()=>releaseExtraction,'held_extract');
  assert.equal(app.learningArchive.state.segments[2].status,'running');
  await input('现在聊点别的吧。');
  await answer('好，我们聊点别的。');
  releaseExtraction();releaseExtraction=null;
  const third=await completedSegment(2);
  await delay(40);
  assert.equal(third.reason,'explicit_end');
  assert.equal(summaries(staleFrom).length,0);
  assert.equal(learningAudio(staleFrom).length,0);
  assert.ok(!third.entries.some(entry=>entry.text.includes('别的')));

  await enterEnglish();
  await input('I enjoy music.');
  holdNext=true;
  const interruptedFrom=await input('今天练到这里');
  await wait(()=>releaseExtraction,'button_extract');
  ws.send(JSON.stringify({type:'interrupt'}));
  await wait(()=>events.slice(interruptedFrom).some(event=>event.type==='local.interrupted'),'button_interrupt');
  releaseExtraction();releaseExtraction=null;
  await completedSegment(3);await delay(40);
  assert.equal(summaries(interruptedFrom).length,0);
  assert.equal(learningAudio(interruptedFrom).length,0);

  await enterEnglish();
  await input('I can swim.');
  const closingAnswerId=await answer('Swimming can be fun.',{played:false});
  holdNext=true;
  const stopFrom=events.length,spokenBeforeStop=speeches.length;
  // Browser receipts already sent immediately before stop are processed first
  // on this socket, even when no extra timer separates the two messages.
  ws.send(JSON.stringify({type:'playback',response_id:closingAnswerId,state:'completed'}));
  receivedPlayback.add(closingAnswerId);
  // Both client messages and the provider close acknowledgment reach the same
  // idempotent finalizer; none may queue this range twice.
  ws.send(JSON.stringify({type:'stop'}));ws.send(JSON.stringify({type:'stop'}));
  await wait(()=>ws.readyState===WebSocket.CLOSED,'stopped');
  await wait(()=>releaseExtraction,'stop_extract');
  assert.equal(app.learningArchive.state.segments[4].status,'running');
  releaseExtraction();releaseExtraction=null;
  const stoppedSegment=await completedSegment(4);
  await delay(40);
  assert.equal(stoppedSegment.reason,'client_end');
  assert.deepEqual(stoppedSegment.entries.map(entry=>entry.text),['I can swim.','Swimming can be fun.']);
  assert.equal(history().entries.find(entry=>entry.responseId===closingAnswerId).playback,'completed');
  assert.equal(summaries(stopFrom).length,0);
  assert.equal(learningAudio(stopFrom).length,0);
  assert.equal(speeches.length,spokenBeforeStop);
  assert.equal(app.learningArchive.state.segments.length,5);
  assert.equal(app.learningArchive.progress().segmentCount,5);
  assert.equal(app.learningArchive.progress().userTurnCount,6);
  assert.equal(history().practice.closed.length,5);
  assert.equal(new Set(history().practice.closed.map(segment=>segment.id)).size,5);
  assert.equal(extracted.length,5);
  assert.ok(!events.some(event=>event.type==='local.error'));
  await finishApp();

  await boot('timeout',50);
  await enterEnglish();
  await input('I eat breakfast every morning.');
  await answer('Breakfast can be simple.');
  holdNext=true;
  const timeoutFrom=await input('今天练到这里');
  await wait(()=>releaseExtraction,'timeout_extract');
  await wait(()=>learningAudio(timeoutFrom).length===1,'pending_notice');
  assert.equal(app.learningArchive.state.segments[0].status,'running');
  assert.equal(summaries(timeoutFrom).length,1);
  assert.match(summaries(timeoutFrom)[0].message,/还在整理/);
  assert.doesNotMatch(summaries(timeoutFrom)[0].message,/已保存/);
  const spokenBeforeResolve=speeches.length;
  releaseExtraction();releaseExtraction=null;
  await completedSegment(0);await delay(80);
  assert.equal(summaries(timeoutFrom).length,1);
  assert.equal(learningAudio(timeoutFrom).length,1);
  assert.equal(speeches.length,spokenBeforeResolve);
  assert.equal(app.modes.current,'daily');
  assert.equal(ws.readyState,WebSocket.OPEN);
  assert.ok(!events.some(event=>event.type==='local.error'));
  await finishApp();

  // A corrupt learning archive must not start pending memory work while the
  // caller is being told that the service failed to start.
  const invalidRoot=join(root,'invalid-startup'),seedStore=new MemoryStore(invalidRoot);
  const seedHistory=new HistoryRecorder(seedStore,'manual');
  seedHistory.user('I like apples.');seedHistory.end('client_end');
  const brokenArchive='{"schemaVersion":1,';
  writeFileSync(join(invalidRoot,'learning.json'),brokenArchive);
  let failedStartExtractCalls=0;
  const failedApp=createVoiceServer({
    config:{key:'mock-only',voice:'mock-only'},port:0,memoryRoot:invalidRoot,withWake:false,
    extract:async()=>{failedStartExtractCalls++;return {result:{summary:'unexpected extraction',memories:[]}};},
    extractPractice:async()=>{failedStartExtractCalls++;return {result:{vocabulary:[],corrections:[]}};}
  });
  try{
    await assert.rejects(failedApp.start(),/learning_invalid_archive_preserve_file/);
    const afterFailure=readFileSync(seedStore.statePath,'utf8');
    await delay(50);
    assert.equal(failedStartExtractCalls,0);
    assert.equal(failedApp.worker.stopped,true);
    assert.equal(readFileSync(seedStore.statePath,'utf8'),afterFailure);
    assert.equal(readFileSync(join(invalidRoot,'learning.json'),'utf8'),brokenArchive);
    assert.ok(Object.values(failedApp.store.state.jobs).every(job=>job.status!=='done'));
  }finally{failedApp.close();}

  console.log(JSON.stringify({
    evaluation:'learning-flow',provider:'local_mock',ports:[proxyPort,providerPort],
    englishPracticeRequestSwitchesBeforeArchiving:true,
    speakingEnglishAloneKeepsDailyMode:true,
    explicitEndSummarizesOnceAndKeepsChatOpen:true,
    onlyCurrentPracticeAndCompletedPlaybackIncluded:true,
    generatedButUnplayedAssistantExcluded:true,
    modeExitArchivesSilently:true,
    newQuestionSuppressesOldSummaryButKeepsArchive:true,
    interruptButtonSuppressesPendingSummaryButKeepsArchive:true,
    clientStopArchivesWithoutLateAudio:true,
    playbackReceiptImmediatelyBeforeStopIsIncluded:true,
    repeatedCloseDoesNotDuplicateProgress:true,
    timeout50msSaysPendingThenCompletesSilently:true,
    invalidLearningArchiveStartsNoWorkersAndPreservesFiles:true,
    completedSegments:6,extractCalls:extracted.length
  },null,2));
}finally{
  releaseExtraction?.();ws?.terminate();
  if(app)await finishApp();
  for(const client of provider.clients)client.terminate();
  await new Promise(resolve=>provider.close(resolve));
  rmSync(root,{recursive:true,force:true});
}
