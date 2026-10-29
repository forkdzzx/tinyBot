import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MemoryStore,HistoryRecorder,atomicJSON,explicitRemember} from '../prototypes/memory/store.mjs';
import {MemoryTools,memorySession} from '../prototypes/memory/tools.mjs';
import {MemoryWorker,extractMemories} from '../prototypes/memory/worker.mjs';
import {PlaybackReceipts} from '../prototypes/voice/playback.mjs';
import {sessionOnlyMemory} from '../prototypes/memory/policy.mjs';

function fixture(t,options={}){const root=mkdtempSync(join(tmpdir(),'jarvis-memory-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return {root,store:new MemoryStore(root,options)};}
function candidate(e,quote='我喜欢喝乌龙茶',key='preference.drink'){return {key,layer:'profile',kind:'fact',source_entry_id:e.id,quote};}
function closed(store,text='我喜欢喝乌龙茶'){const h=new HistoryRecorder(store,'manual'),u=h.user(text);h.end('test');return {h,u,job:store.nextJob()};}

test('history stores both sides and distinguishes generation from browser completion',t=>{
  const {store,root}=fixture(t),h=new HistoryRecorder(store,'manual');h.user('介绍接口');
  h.output({type:'response.output_text.done',response_id:'r',text:'接口定义契约。'});
  assert.equal(store.readSession(h.session.id).entries[1].playback,'not_started');
  h.playback('r','started');h.playback('r','completed');h.end('test');
  const loaded=new MemoryStore(root).readSession(h.session.id);
  assert.equal(loaded.entries[1].text,'接口定义契约。');assert.equal(loaded.entries[1].generation,'complete');assert.equal(loaded.entries[1].playback,'completed');
  assert.ok(loaded.entries.every(e=>e.at&&e.id));assert.equal(loaded.status,'ended');
});
test('interrupted partial text survives and a late receipt cannot claim full playback',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual');h.user('解释一下');
  h.output({type:'response.output_text.delta',response_id:'r',delta:'只生成了一半'});h.interrupt();h.playback('r','completed');h.end('test');
  const e=store.readSession(h.session.id).entries[1];assert.equal(e.text,'只生成了一半');assert.equal(e.generation,'interrupted');assert.equal(e.playback,'interrupted');
});
test('explicit save is durable before acknowledgment and disk failure never changes committed memory',t=>{
  let fail=false;const {store,root}=fixture(t,{write:(p,v)=>{if(fail&&p.endsWith('memory.json'))throw new Error('disk full');atomicJSON(p,v);}});
  const h=new HistoryRecorder(store,'manual'),u=h.user('请记住，我喜欢喝乌龙茶');
  assert.equal(store.remember(h.session.id,candidate(u),u.id).status,'saved');
  assert.equal(JSON.parse(readFileSync(join(root,'memory.json'))).memories.length,1);
  const next=h.user('请记住，我喜欢喝红茶');fail=true;
  assert.throws(()=>store.remember(h.session.id,candidate(next,'我喜欢喝红茶'),next.id));
  assert.equal(store.state.memories.length,1);assert.equal(new MemoryStore(root,{recover:false}).state.memories.length,1);
});
test('memory writes require an explicit current request and exact user evidence',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual'),u=h.user('我喜欢喝乌龙茶');
  assert.throws(()=>store.remember(h.session.id,candidate(u),u.id));
  const request=h.user('请记住，我喜欢喝乌龙茶');
  assert.throws(()=>store.remember(h.session.id,candidate(request,'我喜欢喝咖啡'),request.id));
  h.output({type:'response.output_text.done',response_id:'r',text:'你应该喜欢咖啡'});
  const a=h.session.entries.at(-1);assert.throws(()=>store.remember(h.session.id,candidate(a,'你应该喜欢咖啡'),request.id));
  assert.equal(store.state.memories.length,0);
});
test('background jobs recover after restart and commit memory plus completion together',t=>{
  const {store,root}=fixture(t),{u,job}=closed(store);store.startJob(job.id);
  const resumed=new MemoryStore(root);assert.equal(resumed.state.jobs[job.id].status,'pending');resumed.startJob(job.id);
  resumed.completeJob(job.id,{summary:'饮品偏好',memories:[candidate(u)]});
  const again=new MemoryStore(root);assert.equal(again.state.memories.length,1);assert.equal(again.nextJob(),undefined);
  assert.throws(()=>again.completeJob(job.id,{summary:'',memories:[candidate(u)]}));assert.equal(again.state.memories.length,1);
});
test('unverified observations and different values of one key never overwrite a fact',t=>{
  const {store}=fixture(t);const a=closed(store);store.startJob(a.job.id);store.completeJob(a.job.id,{summary:'',memories:[candidate(a.u)]});
  const b=closed(store,'我喜欢喝红茶');store.startJob(b.job.id);store.completeJob(b.job.id,{summary:'',memories:[candidate(b.u,'我喜欢喝红茶')]});
  const found=store.search('喜欢喝什么');assert.equal(found.memories[0].text,'我喜欢喝乌龙茶');assert.equal(found.pending[0].text,'我喜欢喝红茶');
  const c=closed(store,'我今天有些担心');store.startJob(c.job.id);store.completeJob(c.job.id,{summary:'',memories:[{...candidate(c.u,'我今天有些担心','mood.observation'),kind:'observation'}]});
  assert.equal(store.state.memories.at(-1).status,'pending_confirmation');
});
test('retrieval returns related entries rather than the full history',t=>{
  const {store}=fixture(t),{u,job}=closed(store);store.startJob(job.id);store.completeJob(job.id,{summary:'',memories:[candidate(u)]});
  assert.equal(store.search('喜欢喝什么').memories.length,1);assert.equal(store.search('解释 Java 接口').memories.length,0);
  assert.equal(store.search('你知道我的什么').memories.length,0);
});
test('long histories split into bounded jobs without dropping later user text',t=>{
  const {store,root}=fixture(t),{h}=closed(store,'长'.repeat(27000));const jobs=Object.values(store.state.jobs);
  assert.equal(jobs.flatMap(j=>store.jobInput(j)).reduce((n,e)=>n+e.text.length,0),27000);
  assert.ok(jobs.every(j=>store.jobInput(j).reduce((n,e)=>n+e.text.length,0)<=10000));
  new MemoryStore(root);assert.equal(Object.keys(store.state.jobs).length,jobs.length);assert.equal(store.readSession(h.session.id).entries[0].text.length,27000);
});
test('tools reject stale and repeated calls, and return a failure when durable save fails',t=>{
  let fail=false;const {store}=fixture(t,{write:(p,v)=>{if(fail&&p.endsWith('memory.json'))throw new Error('disk');atomicJSON(p,v);}});
  const h=new HistoryRecorder(store,'manual'),tools=new MemoryTools(store,h);tools.userStarted();h.user('请记住，我喜欢喝乌龙茶');tools.userCompleted();
  const call={name:'remember_user_fact',call_id:'a',arguments:JSON.stringify({key:'preference.drink',layer:'profile',quote:'我喜欢喝乌龙茶'})};
  fail=true;assert.equal(JSON.parse(tools.handle(call).items[0].content[0].text).status,'failed');assert.equal(tools.handle(call),null);
  tools.userStarted();assert.equal(tools.handle({...call,call_id:'b'}),null);tools.close();assert.equal(tools.handle({...call,call_id:'c'}),null);
  assert.equal(store.state.memories.length,0);
});
test('failed extraction preserves the pending job and stops after three attempts',async t=>{
  const {store}=fixture(t),{job}=closed(store);let calls=0;
  const worker=new MemoryWorker(store,{extract:async()=>{calls++;throw new Error('extraction_network_or_timeout');}});
  for(let i=0;i<3;i++){store.commit(s=>{s.jobs[job.id].notBefore=0;});await worker.kick();}
  worker.stop();assert.equal(calls,3);assert.equal(store.state.jobs[job.id].status,'failed');assert.equal(store.state.memories.length,0);
});
test('an unsolicited immediate-save call defers ordinary content without pretending a disk failure',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual'),tools=new MemoryTools(store,h);tools.userStarted();h.user('我的周末爱好是烘焙面包。');tools.userCompleted();
  const result=tools.handle({name:'remember_user_fact',call_id:'auto',arguments:JSON.stringify({key:'hobby.baking',layer:'profile',quote:'我的周末爱好是烘焙面包。'})});
  assert.equal(JSON.parse(result.items[0].content[0].text).status,'deferred');assert.equal(store.state.memories.length,0);
  h.end('test');assert.ok(store.nextJob());
});
test('a malformed candidate leaves the whole extraction transaction unapplied',t=>{
  const {store}=fixture(t),{u,job}=closed(store);store.startJob(job.id);
  assert.throws(()=>store.completeJob(job.id,{summary:'',memories:[candidate(u),candidate(u,'我喜欢咖啡')]}));
  assert.equal(store.state.memories.length,0);assert.equal(store.state.jobs[job.id].status,'running');
});
test('extractor rejects truncated or non-JSON answers and never sends assistant text as user evidence',async()=>{
  const config={key:'test-only',model:'test-only'},input=[{entry_id:'x',text:'我喜欢喝乌龙茶'}];
  const fetchImpl=async(_url,req)=>{const body=JSON.parse(req.body);assert.deepEqual(JSON.parse(body.messages[1].content).user_entries,input);return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}));};
  await assert.rejects(extractMemories(input,[],{config,fetchImpl}),/invalid_or_incomplete/);
});
test('playback receipts wait for all scheduled chunks and ignore completion after interruption',()=>{
  const events=[],r=new PlaybackReceipts((id,state)=>events.push([id,state]));r.stream('old');const a=r.queued(),b=r.queued();r.finish('old');a();
  assert.deepEqual(events,[['old','started']]);r.interrupt();b();assert.deepEqual(events,[['old','started'],['old','interrupted']]);
  r.stream('new');const end=r.queued();r.finish('new');end();assert.deepEqual(events.at(-1),['new','completed']);
});
test('memory prompt replaces the obsolete capability claim and keeps execution boundaries',()=>{
  const r=memorySession('test');assert.ok(!r.session.instructions.includes('未接入联网搜索、手机日历、定时提醒、跨会话记忆'));
  assert.deepEqual(r.session.tools.map(t=>t.name),['read_local_context','remember_user_fact']);assert.ok(r.session.instructions.includes('只有工具返回 saved'));
});
test('quoted, negated or ordinary mention of remembering does not authorize a write',()=>{
  for(const text of ['不要记住这个','请不要记住这个','他说“记住这个”','你能解释记住是什么意思吗',"Don't remember this"])assert.equal(explicitRemember(text),false);
  for(const text of ['请记住，我喜欢喝茶','记住这个','Please remember I like tea'])assert.equal(explicitRemember(text),true);
});
test('an explicit do-not-remember sentence stays in text history but is excluded from extraction',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual'),u=h.user('不要记住这句话，我喜欢喝果汁。');
  h.end('test');assert.equal(store.readSession(h.session.id).entries[0].text,u.text);assert.equal(store.nextJob(),undefined);
});

test('conversational lead-ins save immediately before ending the session',t=>{
  const {store,root}=fixture(t),h=new HistoryRecorder(store,'manual'),tools=new MemoryTools(store,h);
  tools.userStarted();h.user('我想说一下，请你记住，我喜欢喝红茶。');tools.userCompleted();
  const result=tools.handle({name:'remember_user_fact',call_id:'lead-in',arguments:JSON.stringify({key:'preference.drink',layer:'profile',quote:'我喜欢喝红茶'})});
  assert.equal(JSON.parse(result.items[0].content[0].text).status,'saved');
  const persisted=new MemoryStore(root,{recover:false});assert.equal(persisted.state.memories[0].origin,'explicit');assert.equal(h.session.status,'active');
  for(const text of ['我想说一下请你记住我喜欢红茶','另外，请记住，我喜欢红茶','By the way, please remember I like tea'])assert.equal(explicitRemember(text),true,text);
  for(const text of ['我想说一下，请你不要记住这个','如果我说请你记住会怎样','记住是什么意思','我看到他写请你记住','记住了吗？'])assert.equal(explicitRemember(text),false,text);
});
test('temporary interaction instructions are not durable preferences; genuine habits survive',()=>{
  for(const text of ['我想说中文了。','今天用英文聊天','请你用中文回答','陪我练英语','这次详细解释','Please speak English','Let us reply in Chinese for now'])assert.equal(sessionOnlyMemory(text),true,text);
  for(const text of ['我平时喜欢用中文聊天','以后默认用中文回答','我想提高英语口语水平','我想每天练英语','我的英语水平一般','我喜欢喝红茶','I usually prefer to speak English'])assert.equal(sessionOnlyMemory(text),false,text);
  assert.equal(sessionOnlyMemory('我喜欢用中文聊天','今天我喜欢用中文聊天。'),true);
});
test('scope filtering keeps valid facts and history, completes the job, and audits skipped candidates',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual');
  const temp=h.user('我想说中文了。'),fact=h.user('我喜欢喝乌龙茶');h.end('test');const job=store.nextJob();store.startJob(job.id);
  store.completeJob(job.id,{summary:'用户本次改说中文，喜欢乌龙茶。',memories:[candidate(temp,temp.text,'preference.language'),candidate(fact)]});
  assert.equal(store.state.memories.length,1);assert.equal(store.state.memories[0].key,'preference.drink');
  assert.equal(store.state.jobs[job.id].status,'done');assert.equal(store.state.jobs[job.id].skippedCandidates[0].sourceEntryId,temp.id);
  assert.equal(store.readSession(h.session.id).entries[0].text,temp.text);
});
test('even explicit save does not silently turn this-session language into a long-term default',t=>{
  const {store}=fixture(t),h=new HistoryRecorder(store,'manual'),u=h.user('请记住，今天用中文聊天');
  assert.equal(store.remember(h.session.id,candidate(u,'今天用中文聊天','preference.language'),u.id).status,'session_only');
  assert.equal(store.state.memories.length,0);
});
test('excluded incorrect memory retains evidence but cannot be retrieved or cause a false conflict',t=>{
  const {store,root}=fixture(t),{u,job}=closed(store);store.startJob(job.id);store.completeJob(job.id,{summary:'',memories:[candidate(u)]});
  const m=store.state.memories[0];assert.throws(()=>store.exclude(m.id,'changed text','repair'));
  assert.equal(store.exclude(m.id,m.text,'reviewed_incorrect'),true);
  assert.deepEqual(store.search('喜欢喝什么').memories,[]);assert.deepEqual(store.search('喜欢喝什么').pending,[]);
  const newStore=new MemoryStore(root);assert.equal(newStore.state.memories[0].sources[0].entryId,u.id);
  const h=new HistoryRecorder(newStore,'manual'),next=h.user('请记住，我喜欢喝红茶');
  assert.equal(newStore.remember(h.session.id,candidate(next,'我喜欢喝红茶'),next.id).status,'saved');
});
