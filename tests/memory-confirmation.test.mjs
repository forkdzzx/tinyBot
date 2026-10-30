import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MemoryStore,HistoryRecorder,atomicJSON} from '../prototypes/memory/store.mjs';
import {MemoryTools} from '../prototypes/memory/tools.mjs';
import {confirmationDecision} from '../prototypes/memory/policy.mjs';
import {memorySpeech} from '../prototypes/voice/memory-speech.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'jarvis-confirm-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const store=new MemoryStore(root);return {root,store,h:new HistoryRecorder(store,'manual')};}
function save(store,h,text,key='preference.drink'){const u=h.user('请记住，'+text);return store.remember(h.session.id,{key,layer:'profile',source_entry_id:u.id,quote:text},u.id);}
function conflict(t){const f=fixture(t);save(f.store,f.h,'我喜欢喝红茶');const candidate=save(f.store,f.h,'我现在只喜欢喝绿茶');const offered=f.store.offerConfirmation(candidate.memoryId,f.h.session.id,f.h.currentUser,{explicit:true});return {...f,candidate,offered};}
function heard(f,playback='completed'){
  f.store.bindConfirmation(f.candidate.memoryId,f.offered.offer.token,'question');
  f.h.output({type:'response.output_text.done',response_id:'question',text:f.offered.offer.question},{source:'local_memory'});
  f.h.playback('question',playback);
}
function reply(f,text){const u=f.h.user(text);return f.store.resolveConfirmation(f.candidate.memoryId,f.offered.offer.token,f.h.session.id,u.id);}
test('positive hobbies coexist while exclusivity and scalar names stay pending',t=>{
  const {store,h}=fixture(t);assert.equal(save(store,h,'我的爱好就是周末在家打游戏','preference.hobby').status,'saved');
  assert.equal(save(store,h,'我喜欢打篮球','preference.hobby').status,'saved');
  assert.equal(store.search('我的爱好').memories.length,2);
  assert.equal(save(store,h,'我现在只喜欢打篮球','preference.hobby').status,'pending_confirmation');
  assert.equal(save(store,h,'我的项目叫晨星','project.name').status,'pending_confirmation');
});
test('only an immediate reply to a completed local question can replace old memory',t=>{
  const f=conflict(t);assert.equal(f.offered.status,'confirmation_required');heard(f);
  assert.equal(reply(f,'是的，按新的记').status,'saved');
  assert.equal(f.store.search('喜欢喝什么').memories[0].text,'我现在只喜欢喝绿茶');
  assert.equal(f.store.state.memories[0].status,'superseded');assert.equal(f.store.state.memories[0].supersededBy,f.candidate.memoryId);
  const disk=new MemoryStore(f.root,{recover:false});assert.equal(disk.state.memories[1].decisions[0].source.quote,'是的，按新的记');
  assert.equal(f.store.resolveConfirmation(f.candidate.memoryId,f.offered.offer.token,f.h.session.id,f.h.currentUser).status,'rejected');
});
test('replacement questions identify every old value and decline an oversized scope',t=>{
  const {store,h}=fixture(t);
  save(store,h,'我喜欢打游戏','preference.hobby');save(store,h,'我喜欢打篮球','preference.hobby');
  const c=save(store,h,'我现在只喜欢游泳','preference.hobby');
  const offered=store.offerConfirmation(c.memoryId,h.session.id,h.currentUser,{explicit:true});
  assert.match(offered.offer.question,/我喜欢打游戏/);assert.match(offered.offer.question,/我喜欢打篮球/);assert.match(offered.offer.question,/替换这 2 条旧记录/);
  save(store,h,'我喜欢画画','preference.hobby');save(store,h,'我喜欢跑步','preference.hobby');
  const next=save(store,h,'我现在只喜欢滑雪','preference.hobby');
  assert.equal(store.offerConfirmation(next.memoryId,h.session.id,h.currentUser,{explicit:true}).status,'needs_detail');
  assert.equal(store.state.memories.filter(m=>m.status==='confirmed').length,4);
});
test('reject keeps the old fact and background extraction cannot resurrect a rejected source',t=>{
  const f=conflict(t);heard(f);assert.equal(reply(f,'保留原来的').status,'kept_existing');
  assert.equal(f.store.state.memories[1].status,'rejected');f.h.end('test');const job=f.store.nextJob();f.store.startJob(job.id);
  const u=f.h.session.entries.find(e=>e.role==='user'&&e.text.includes('绿茶'));
  f.store.completeJob(job.id,{summary:'',memories:[{key:'preference.drink',kind:'fact',layer:'profile',source_entry_id:u.id,quote:'现在只喜欢喝绿茶'}]});
  assert.equal(f.store.state.memories.length,2);assert.equal(f.store.search('喝什么').pending.length,0);assert.equal(f.store.search('喝什么').memories[0].text,'我喜欢喝红茶');
});
test('background extraction including the request prefix does not duplicate a confirmed replacement',t=>{
  const f=conflict(t);heard(f);reply(f,'确认');f.h.end('test');const job=f.store.nextJob();f.store.startJob(job.id);
  const u=f.h.session.entries.find(e=>e.role==='user'&&e.text.includes('绿茶'));
  f.store.completeJob(job.id,{summary:'',memories:[{key:'preference.drink',kind:'fact',layer:'profile',source_entry_id:u.id,quote:u.text}]});
  assert.equal(f.store.state.memories.length,2);assert.equal(f.store.search('喝什么').pending.length,0);
  assert.equal(f.store.search('喝什么').memories[0].text,'我现在只喜欢喝绿茶');
});
test('defer preserves both records and does not ask the same candidate again automatically',t=>{
  const f=conflict(t);heard(f);assert.equal(reply(f,'先不改').status,'deferred_confirmation');
  assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories[1].status,'pending_confirmation');
  assert.equal(f.store.offerConfirmation(f.candidate.memoryId,f.h.session.id,f.h.currentUser).reason,'already_asked');
});
for(const variant of ['not_played','interrupted','intervening_user','quoted_reply','wrong_token','other_session'])test(`confirmation refuses ${variant}`,t=>{
  const f=conflict(t);heard(f,variant==='interrupted'?'interrupted':variant==='not_played'?'started':'completed');
  if(variant==='intervening_user')f.h.user('今天天气怎么样');
  const h=variant==='other_session'?new HistoryRecorder(f.store,'manual'):f.h;
  const u=h.user(variant==='quoted_reply'?'他说“确认更新”是什么意思':'确认更新');
  const result=f.store.resolveConfirmation(f.candidate.memoryId,variant==='wrong_token'?'bad':f.offered.offer.token,h.session.id,u.id);
  assert.equal(result.status,'rejected');assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories[1].status,'pending_confirmation');
});
test('a concurrent memory change invalidates the offered replacement scope',t=>{
  const f=conflict(t);heard(f);const other=new HistoryRecorder(f.store,'manual');save(f.store,other,'我喜欢喝乌龙茶');
  assert.equal(reply(f,'确认').status,'stale');assert.equal(f.store.state.memories[0].status,'confirmed');
});
test('disk failure during confirmation preserves old state and cannot return saved',t=>{
  const f=conflict(t);heard(f);f.store.write=(p,v)=>{if(p.endsWith('memory.json'))throw new Error('disk full');atomicJSON(p,v);};
  assert.throws(()=>reply(f,'确认'));assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories[1].status,'pending_confirmation');
});
test('a fresh explicit assertion can propose a previously rejected value again without erasing audit',t=>{
  const f=conflict(t);heard(f);reply(f,'保留原来的');
  const newCandidate=save(f.store,f.h,'我现在只喜欢喝绿茶');assert.notEqual(newCandidate.memoryId,f.candidate.memoryId);assert.equal(newCandidate.status,'pending_confirmation');
  assert.equal(f.store.state.memories[1].status,'rejected');
});
test('bare yes, hypothetical phrases and negative instructions cannot forge a confirmation',()=>{
  for(const s of ['如果我说确认','他说确认更新','对吗？','不保留原来的','不要确认','确认以后再说'])assert.equal(confirmationDecision(s),null,s);
  assert.equal(confirmationDecision('是的，按新的计。'),'accept');assert.equal(confirmationDecision('不要按新的计'),null);
  assert.equal(confirmationDecision('是的，就按这个记吧'),'accept');assert.equal(confirmationDecision('对，不要更新'),null);
});
test('only a candidate returned by this turn lookup may be offered by the model',t=>{
  const f=conflict(t),events=[],tools=new MemoryTools(f.store,f.h,{onFeedback:r=>events.push(r)});
  tools.userStarted();f.h.user('我的饮品偏好是什么');tools.userCompleted();
  const result=tools.handle({call_id:'invented',name:'ask_memory_confirmation',arguments:JSON.stringify({memory_id:f.candidate.memoryId})});
  assert.equal(JSON.parse(result.items[0].content[0].text).status,'rejected');
  assert.equal(events[0].status,'rejected');
});
test('host speech describes committed states, never a model-provided message',()=>{
  assert.equal(memorySpeech({status:'failed',text:'已经记住了'}),'这次没保存成功，先不算记住。');
  assert.equal(memorySpeech({status:'saved'}),'记住了，已经保存。');
  assert.equal(memorySpeech({status:'deferred'}),'嗯，我们接着聊。');
});
test('legacy additive repair is previewable, auditable, idempotent and does not touch genuine conflicts',t=>{
  const {store,h}=fixture(t);save(store,h,'我的爱好就是周末在家打游戏','preference.hobby');
  const b=save(store,h,'我喜欢打篮球','preference.hobby');
  store.commit(s=>{const m=s.memories.find(m=>m.id===b.memoryId);m.status='pending_confirmation';m.reason='possible_conflict';delete m.additive;});
  const c=save(store,h,'我现在只喜欢打网球','preference.hobby');
  assert.deepEqual(store.reconcileAdditivePreferences({dryRun:true}),[b.memoryId]);assert.equal(store.state.memories[1].status,'pending_confirmation');
  assert.deepEqual(store.reconcileAdditivePreferences(),[b.memoryId]);assert.equal(store.state.memories[1].decisions[0].decision,'compatible_addition');
  assert.equal(store.state.memories.find(m=>m.id===c.memoryId).status,'pending_confirmation');assert.deepEqual(store.reconcileAdditivePreferences(),[]);
});
