import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {MemoryStore,HistoryRecorder} from '../prototypes/memory/store.mjs';
import {LearningArchive} from '../prototypes/learning/archive.mjs';
import {PracticeTracker,recoverPractice} from '../prototypes/learning/tracker.mjs';
import {LearningWorker,waitForLearning,learningSpeech,learningContext} from '../prototypes/learning/worker.mjs';

const emptyReport=()=>({vocabulary:[],corrections:[]});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'jarvis-learning-life-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const store=new MemoryStore(root),history=new HistoryRecorder(store,'manual'),archive=new LearningArchive(root);
  return {root,store,history,archive,tracker:new PracticeTracker(history,archive)};
}
function reply(history,text,{source='provider_output',generation='complete',playback='completed'}={}){
  const responseId=randomUUID();
  history.output(generation==='complete'?{type:'response.output_text.done',response_id:responseId,text}:{type:'response.output_text.delta',response_id:responseId,delta:text},{source});
  if(playback!=='not_started')history.playback(responseId,playback);
  return history.session.entries.find(e=>e.responseId===responseId);
}
function practice(f,text='I eat breakfast.',reason='explicit_end'){
  f.tracker.enter();f.history.user(text);return f.tracker.close(reason);
}
function complete(archive,id,result=emptyReport()){
  archive.begin(id);return archive.complete(id,result);
}

test('practice captures only actual segment speech and fully heard provider answers',t=>{
  const f=fixture(t),{history,tracker,archive}=f;
  history.user('This happened before English practice.');reply(history,'Earlier answer.');
  tracker.enter();
  for(const text of ['陪我练英语','进入工作模式','等一下，我想想','结束聊天','今天练到这里吧']){
    history.user(text);reply(history,'Control acknowledgement.');
  }
  history.user("Do not remember this private example.");reply(history,'Private response.');
  assert.equal(history.session.entries.find(e=>e.text.includes('private example')).memoryExcluded,true);
  const user=history.user('I eat breakfast.'),heard=reply(history,'What do you have for breakfast?');
  reply(history,'Still generating.',{generation:'streaming'});
  reply(history,'Not played.',{playback:'not_started'});
  reply(history,'Playing now.',{playback:'started'});
  reply(history,'Interrupted answer.',{playback:'interrupted'});
  reply(history,'Saved a preference.',{source:'local_memory'});
  reply(history,'Switched a mode.',{source:'local_mode'});
  reply(history,'Internal instruction.',{source:'internal_state'});
  history.session.entries.push({id:randomUUID(),role:'system',text:'Hidden system state.'});
  const exit=history.user('不练英语，只是聊天');reply(history,'Daily conversation.');
  const jobs=tracker.close('mode_exit',exit.id);
  assert.equal(jobs.length,1);
  assert.deepEqual(jobs[0].entries,[{id:user.id,role:'user',text:user.text},{id:heard.id,role:'assistant',text:heard.text}]);
  assert.equal(archive.progress().segmentCount,0);
});

test('closing is idempotent and starts a fresh range for a later practice segment',t=>{
  const f=fixture(t),[first]=practice(f);
  assert.deepEqual(f.tracker.close('explicit_end'),[]);
  assert.equal(f.history.session.practice.closed.length,1);
  assert.equal(f.archive.state.segments.length,1);
  f.history.user('Not part of the exercise.');
  const [second]=practice(f,'I drink tea.');
  assert.notEqual(first.id,second.id);
  assert.deepEqual(second.entries.map(e=>e.text),['I drink tea.']);
  assert.equal(f.history.session.practice.closed.length,2);
});

test('no user practice, control-only ranges and excluded speech do not create learning work',t=>{
  const f=fixture(t);
  f.tracker.enter();reply(f.history,'Ready to practice.');
  assert.deepEqual(f.tracker.close('explicit_end'),[]);
  f.tracker.enter();f.history.user('陪我练英语');reply(f.history,'Ready.');f.history.user('不要保存这一句');reply(f.history,'Understood.');
  assert.deepEqual(f.tracker.close('explicit_end'),[]);
  assert.equal(f.archive.state.segments.length,0);
  assert.equal(f.archive.progress().userTurnCount,0);
});

test('history closes durably before queue failure and recovery replays the exact job only once',t=>{
  const f=fixture(t),queue=f.archive.queue.bind(f.archive);
  f.tracker.enter();f.history.user('I like green tea.');reply(f.history,'Green tea is refreshing.');
  f.archive.queue=()=>{throw new Error('simulated_archive_disk_failure');};
  assert.throws(()=>f.tracker.close('explicit_end'),/simulated_archive_disk_failure/);
  const saved=f.store.readSession(f.history.session.id);
  assert.equal(saved.practice.active,null);assert.equal(saved.practice.closed.length,1);
  assert.equal(f.archive.state.segments.length,0);
  f.history.end('test_complete');f.archive.queue=queue;
  recoverPractice(f.store,f.archive);recoverPractice(f.store,f.archive);
  const [job]=f.archive.pending();assert.equal(job.id,saved.practice.closed[0].id);
  assert.deepEqual(job.entries,saved.practice.closed[0].entries);
  assert.equal(job.endedAt,saved.practice.closed[0].endedAt);
  complete(f.archive,job.id);recoverPractice(f.store,f.archive);
  assert.equal(f.archive.state.segments.length,1);
  assert.equal(f.archive.get(job.id).status,'done');
  assert.equal(f.archive.get(job.id).attempts,1);
});

test('replay after a partial multi-job queue preserves finished work and queues the missing remainder',t=>{
  const f=fixture(t),queue=f.archive.queue.bind(f.archive);let writes=0;
  f.tracker.enter();f.history.user('Long practice sentence. '.repeat(1000));
  f.archive.queue=job=>{if(++writes===2)throw new Error('second_queue_write_failed');return queue(job);};
  assert.throws(()=>f.tracker.close('explicit_end'),/second_queue_write_failed/);
  const saved=f.store.readSession(f.history.session.id),[first]=f.archive.pending();
  assert.ok(saved.practice.closed.length>1);assert.equal(f.archive.state.segments.length,1);
  complete(f.archive,first.id);f.history.end('test_complete');f.archive.queue=queue;
  recoverPractice(f.store,f.archive);recoverPractice(f.store,f.archive);
  assert.equal(f.archive.state.segments.length,saved.practice.closed.length);
  assert.equal(f.archive.get(first.id).status,'done');assert.equal(f.archive.get(first.id).attempts,1);
  assert.equal(f.archive.pending().length,saved.practice.closed.length-1);
  for(const job of f.archive.pending())complete(f.archive,job.id);
  assert.equal(f.archive.progress().userTurnCount,1);
});

test('interrupted process recovers the persisted active range, excluding unfinished playback',t=>{
  const f=fixture(t);
  f.history.user('Outside the practice range.');f.tracker.enter();
  const user=f.history.user('I walk to work.'),heard=reply(f.history,'How long is your walk?');
  reply(f.history,'You should never hear this partial answer.',{generation:'streaming',playback:'started'});
  const store=new MemoryStore(f.root),archive=new LearningArchive(f.root);
  assert.equal(store.readSession(f.history.session.id).status,'interrupted');
  recoverPractice(store,archive);recoverPractice(store,archive);
  const [job]=archive.pending();assert.equal(archive.pending().length,1);
  assert.equal(job.reason,'process_restart');
  assert.deepEqual(job.entries.map(e=>e.id),[user.id,heard.id]);
  const saved=store.readSession(f.history.session.id);
  assert.equal(saved.practice.active,null);assert.equal(saved.practice.closed.length,1);
});

test('recovery leaves a live session and its active practice range alone',t=>{
  const f=fixture(t);f.tracker.enter();f.history.user('I am practicing now.');
  const active=structuredClone(f.history.session.practice.active);
  recoverPractice(f.store,f.archive);
  assert.deepEqual(f.store.readSession(f.history.session.id).practice.active,active);
  assert.equal(f.archive.pending().length,0);
});

test('long user speech is split without losing text or counting one user turn repeatedly',t=>{
  const f=fixture(t),text='English practice. '.repeat(1200);
  f.tracker.enter();const user=f.history.user(text);const jobs=f.tracker.close('explicit_end');
  assert.ok(jobs.length>1);
  assert.equal(jobs.flatMap(j=>j.entries).map(e=>e.text).join(''),text);
  for(const job of jobs){
    assert.ok(job.entries.length<=60);assert.ok(job.entries.reduce((n,e)=>n+e.text.length,0)<=16000);
    for(const entry of job.entries){assert.ok(entry.text.length<=2000);assert.equal(entry.id.split(':')[0],user.id);}
    complete(f.archive,job.id);
  }
  assert.equal(f.archive.progress().segmentCount,jobs.length);
  assert.equal(f.archive.progress().userTurnCount,1);
});

test('many short turns respect per-segment entry bounds while preserving their source order',t=>{
  const f=fixture(t);f.tracker.enter();const expected=[];
  for(let n=0;n<45;n++){
    expected.push(f.history.user(`I count ${n}.`).id);
    expected.push(reply(f.history,`Next number after ${n}?`).id);
  }
  const jobs=f.tracker.close('explicit_end');assert.ok(jobs.length>1);
  assert.deepEqual(jobs.flatMap(j=>j.entries).map(e=>e.id),expected);
  for(const job of jobs){assert.ok(job.entries.length<=60);complete(f.archive,job.id);}
  assert.equal(f.archive.progress().userTurnCount,45);
});

test('a long fully played assistant answer remains available after segment splitting',t=>{
  const f=fixture(t),text='A helpful English example. '.repeat(800);
  f.tracker.enter();f.history.user('Tell me an English story.');reply(f.history,text);
  const jobs=f.tracker.close('explicit_end');
  const restored=jobs.flatMap(j=>j.entries).filter(e=>e.role==='assistant').map(e=>e.text).join('');
  assert.equal(restored.length,text.length,'all fully played assistant source text must survive chunking');
  assert.ok(restored===text,'assistant chunks must retain their exact original order and content');
  for(const job of jobs)complete(f.archive,job.id);
  assert.equal(f.archive.progress().userTurnCount,1);
});

test('overflow anchors use the matching real learner source and count within each chunk budget',t=>{
  const f=fixture(t);f.tracker.enter();
  const one=f.history.user('My first example. '.repeat(1000)),answerOne=reply(f.history,'The first response. '.repeat(1200));
  const two=f.history.user('My second example.'),answerTwo=reply(f.history,'The second response. '.repeat(1100));
  const sources=new Map([[one.id,one],[two.id,two]]),owners=new Map([[answerOne.id,one.id],[answerTwo.id,two.id]]);
  const jobs=f.tracker.close('explicit_end');assert.ok(jobs.length>2);
  for(const job of jobs){
    assert.ok(job.entries.length<=60);assert.ok(job.entries.reduce((n,e)=>n+e.text.length,0)<=16000);
    assert.equal(new Set(job.entries.map(e=>e.id)).size,job.entries.length);
    for(const entry of job.entries){
      assert.ok(entry.text.length<=2000);
      const [originalId,offset='0']=entry.id.split(':');
      if(entry.role==='user'){
        const original=sources.get(originalId);assert.ok(original,'anchors cannot manufacture learner entries');
        assert.equal(entry.text,original.text.slice(Number(offset),Number(offset)+2000));
      }else{
        const owner=owners.get(originalId);assert.ok(owner);
        assert.ok(job.entries.some(e=>e.role==='user'&&e.id.split(':')[0]===owner),'assistant overflow requires its own learner source');
      }
    }
    complete(f.archive,job.id);
  }
  for(const answer of [answerOne,answerTwo])assert.ok(jobs.flatMap(j=>j.entries).filter(e=>e.role==='assistant'&&e.id.split(':')[0]===answer.id).map(e=>e.text).join('')===answer.text);
  assert.equal(f.archive.progress().userTurnCount,2);
});

test('assistant overflow cannot create a synthetic learner anchor when its source is empty',t=>{
  const f=fixture(t);f.tracker.enter();f.history.user('   ');reply(f.history,'An unsolicited long answer. '.repeat(1000));
  assert.deepEqual(f.tracker.close('explicit_end'),[]);
  assert.equal(f.archive.state.segments.length,0);assert.equal(f.archive.progress().userTurnCount,0);
});

test('concurrent requests for one job share one extraction and completed jobs do not rerun',async t=>{
  const f=fixture(t),[job]=practice(f),started=deferred(),release=deferred(),events=[];let calls=0;
  const worker=new LearningWorker(f.archive,{extract:async entries=>{calls++;assert.deepEqual(entries,job.entries);started.resolve();await release.promise;return {result:emptyReport(),usage:{total_tokens:10}};},onStatus:event=>events.push(event)});
  t.after(()=>worker.stop());
  const first=worker.run(job.id),second=worker.run(job.id);assert.equal(first,second);
  await started.promise;assert.equal(calls,1);release.resolve();
  assert.equal((await first).status,'done');assert.equal((await second).status,'done');
  assert.equal((await worker.run(job.id)).status,'done');assert.equal(calls,1);
  assert.deepEqual(events,[{type:'learning.done',segmentId:job.id,usage:{total_tokens:10}}]);
});

test('different learning jobs are extracted serially',async t=>{
  const f=fixture(t),[one]=practice(f),[two]=practice(f,'I drink water.'),started=deferred(),release=deferred();let calls=0,active=0,peak=0;
  const worker=new LearningWorker(f.archive,{extract:async()=>{calls++;active++;peak=Math.max(peak,active);if(calls===1){started.resolve();await release.promise;}active--;return {result:emptyReport()};}});
  t.after(()=>worker.stop());
  const first=worker.run(one.id),second=worker.run(two.id);await started.promise;
  assert.equal(calls,1);assert.equal(f.archive.get(two.id).status,'queued');release.resolve();
  await Promise.all([first,second]);assert.equal(calls,2);assert.equal(peak,1);
});

test('extraction failure retries at most twice and retains failure without successful progress',async t=>{
  const f=fixture(t),[job]=practice(f),events=[];let calls=0;
  const worker=new LearningWorker(f.archive,{extract:async()=>{calls++;throw new Error('learning_network_or_timeout');},onStatus:event=>events.push(event)});
  t.after(()=>worker.stop());
  assert.equal((await worker.run(job.id)).status,'queued');
  assert.equal((await worker.run(job.id)).status,'failed');
  assert.equal((await worker.run(job.id)).status,'failed');
  assert.equal(calls,2);assert.equal(f.archive.get(job.id).attempts,2);
  assert.equal(f.archive.get(job.id).errors.length,2);assert.equal(f.archive.progress().segmentCount,0);
  assert.deepEqual(events.map(e=>e.type),['learning.failed','learning.failed']);
  assert.doesNotMatch(learningSpeech([f.archive.get(job.id)]),/已保存/);
});

test('an unsupported model source is reported as failure and cannot publish a successful record',async t=>{
  const f=fixture(t),[job]=practice(f),events=[];
  const worker=new LearningWorker(f.archive,{extract:async()=>({result:{vocabulary:[{word:'invented',meaning:'虚构',entryId:job.entries[0].id,quote:'invented source'}],corrections:[]}}),onStatus:event=>events.push(event)});
  t.after(()=>worker.stop());
  const result=await worker.run(job.id);
  assert.equal(result.status,'queued');assert.equal(result.report,undefined);
  assert.equal(events.length,1);assert.equal(events[0].type,'learning.failed');
  assert.equal(f.archive.progress().segmentCount,0);assert.doesNotMatch(learningSpeech([result]),/已保存/);
});

test('stop aborts the request and late extraction cannot save a report or begin queued work',async t=>{
  const f=fixture(t),[one]=practice(f),[two]=practice(f,'I drink water.'),started=deferred(),release=deferred(),events=[];let calls=0,signal;
  const worker=new LearningWorker(f.archive,{extract:async(_entries,options)=>{calls++;signal=options.signal;started.resolve();await release.promise;return {result:emptyReport()};},onStatus:event=>events.push(event)});
  t.after(()=>worker.stop());
  const first=worker.run(one.id),second=worker.run(two.id);await started.promise;worker.stop();
  assert.equal(signal.aborted,true);release.resolve();await Promise.all([first,second]);
  assert.equal(calls,1);assert.equal(f.archive.get(one.id).status,'running');
  assert.equal(f.archive.get(one.id).report,undefined);assert.equal(f.archive.get(two.id).attempts,0);
  assert.equal(f.archive.get(two.id).status,'queued');assert.equal(f.archive.progress().segmentCount,0);
  assert.deepEqual(events,[]);
  assert.equal(new LearningArchive(f.root).get(one.id).status,'queued');
});

test('a throwing status observer cannot turn persisted success into failure or alter retries',async t=>{
  const f=fixture(t),[one]=practice(f),[two]=practice(f,'I drink water.');let observations=0,calls=0;
  const worker=new LearningWorker(f.archive,{extract:async()=>{if(++calls===2)throw new Error('learning_network_or_timeout');return {result:emptyReport()};},onStatus:()=>{observations++;throw new Error('UI subscriber failure');}});
  t.after(()=>worker.stop());
  assert.equal((await worker.run(one.id)).status,'done');
  assert.equal(f.archive.get(one.id).attempts,1);assert.equal(f.archive.get(one.id).error,undefined);
  assert.equal((await worker.run(two.id)).status,'queued');
  assert.equal(f.archive.get(two.id).attempts,1);assert.equal(f.archive.get(two.id).errors.length,1);
  assert.equal(f.archive.progress().segmentCount,1);assert.equal(observations,2);
});

test('waiting for the spoken summary times out without claiming that learning was saved',async t=>{
  const f=fixture(t),[job]=practice(f),started=deferred(),release=deferred();
  const worker=new LearningWorker(f.archive,{extract:async()=>{started.resolve();await release.promise;return {result:emptyReport()};}});
  t.after(()=>worker.stop());
  const task=worker.run(job.id);await started.promise;
  assert.equal(await waitForLearning(task,5),null);
  const spoken=learningSpeech([f.archive.get(job.id)]);
  assert.match(spoken,/还在整理/);assert.doesNotMatch(spoken,/已保存|已整理好|整理成功/);
  release.resolve();assert.equal((await task).status,'done');
  assert.equal(await waitForLearning(Promise.resolve('already ready'),50),'already ready');
});

test('short summaries limit vocabulary and corrections, and leave lengthy details in the record',()=>{
  const normal={status:'done',report:{vocabulary:[{word:'breakfast',meaning:'早餐'},{word:'tea',meaning:'茶'},{word:'thirdword',meaning:'不应播出的第三项'}],corrections:[{quote:'I eats eggs.',suggestion:'I eat eggs.'},{quote:'Second mistake.',suggestion:'Second fix.'}]}};
  const speech=learningSpeech([normal]);
  assert.match(speech,/breakfast/);assert.match(speech,/tea/);assert.match(speech,/I eat eggs\./);
  assert.doesNotMatch(speech,/thirdword|Second mistake|Second fix/);assert.ok(speech.length<=150);
  const long={status:'done',report:{vocabulary:[{word:'x'.repeat(41),meaning:'释义'},{word:'short',meaning:'很'.repeat(61)}],corrections:[{quote:'q'.repeat(81),suggestion:'s'.repeat(81)}]}};
  assert.match(learningSpeech([long]),/较长的复习建议/);assert.ok(learningSpeech([long]).length<=80);
  const largest={status:'done',report:{vocabulary:Array.from({length:3},()=>({word:'w'.repeat(40),meaning:'释'.repeat(60)})),corrections:Array.from({length:3},()=>({quote:'q'.repeat(80),suggestion:'s'.repeat(80)}))}};
  assert.ok(learningSpeech(Array(20).fill(largest)).length<=450);
  for(const jobs of [[],[null],[{status:'queued'}],[{status:'failed'}],[normal,{status:'running'}]])assert.doesNotMatch(learningSpeech(jobs),/已保存/);
});

test('learning context reports practice and exposure without treating unfinished jobs as progress',t=>{
  const f=fixture(t),[one]=practice(f,'I eat breakfast.');
  complete(f.archive,one.id,{vocabulary:[{word:'breakfast',meaning:'早餐',entryId:one.entries[0].id,quote:'I eat breakfast.'}],corrections:[]});
  practice(f,'I drink water.');
  const context=learningContext(f.archive);
  assert.equal(context.segmentCount,1);assert.equal(context.userTurnCount,1);
  assert.deepEqual(context.lastVocabulary,[{word:'breakfast',meaning:'早餐'}]);assert.deepEqual(context.lastCorrections,[]);
  assert.match(context.meaning,/不代表已经掌握或能力评级/);
});
