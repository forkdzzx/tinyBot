import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MemoryStore,HistoryRecorder} from '../prototypes/memory/store.mjs';
import {MemoryTools} from '../prototypes/memory/tools.mjs';
import {explicitRemember,memoryIdentity,confirmationReply} from '../prototypes/memory/policy.mjs';
import {memorySpeech} from '../prototypes/voice/memory-speech.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'jarvis-correction-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const store=new MemoryStore(root);return {store,h:new HistoryRecorder(store,'manual')};}
function save(f,text,key='preference.drink',quote=text.replace(/^请记住[，,]?/u,'')){const u=f.h.user(text);return f.store.remember(f.h.session.id,{key,layer:'profile',source_entry_id:u.id,quote},u.id);}
function question(f,candidate,playback='completed'){
  const offer=f.store.offerConfirmation(candidate.memoryId,f.h.session.id,f.h.currentUser,{explicit:true});
  assert.equal(offer.status,'confirmation_required');f.store.bindConfirmation(candidate.memoryId,offer.offer.token,'q');
  f.h.output({type:'response.output_text.done',response_id:'q',text:offer.offer.question},{source:'local_memory'});f.h.playback('q',playback);return offer;
}
function resolve(f,offer,text){const u=f.h.user(text);return f.store.resolveConfirmation(offer.memoryId,offer.offer.token,f.h.session.id,u.id);}
test('actual corrective save prefix is accepted without accepting negated or quoted commands',()=>{
  for(const s of ['不，请记住，我现在喜欢喝的是绿茶。','不不，请你记住我喜欢喝红茶'])assert.equal(explicitRemember(s),true,s);
  for(const s of ['不记住这个','不，请不要记住这个','不是请记住这个','如果说不，请记住会怎样','他说“不，请记住”','不，请记住是什么意思'])assert.equal(explicitRemember(s),false,s);
});
test('known drink aliases and beverage evidence share a key without promoting a like',()=>{
  for(const key of ['drink.favorite','beverage.preference','preference.drink','favorite_drink','user.drink.favorite','arbitrary.key']){
    const p=memoryIdentity(key,'我喜欢喝绿茶');assert.equal(p.key,'preference.drink');assert.equal(p.preferenceKind,'like');
  }
  assert.equal(memoryIdentity('drink.favorite','喜欢喝红茶','我最喜欢喝红茶').preferenceKind,'favorite');
  assert.equal(memoryIdentity('book.topic','我喜欢茶文化的书').key,'book.topic');
});
test('actual green-tea correction stays pending across aliases and background extraction',t=>{
  const f=fixture(t);save(f,'请记住，我现在最喜欢喝的是红茶','drink.favorite');
  const c=save(f,'不，请记住，我现在喜欢喝的是绿茶。','preference.drink','我现在喜欢喝的是绿茶');assert.equal(c.status,'pending_confirmation');
  assert.match(f.store.favoriteDrinkReply('我现在最喜欢喝的是什么茶？'),/红茶/);
  f.h.end('test');const job=f.store.nextJob();f.store.startJob(job.id);const u=f.h.session.entries.filter(e=>e.role==='user').at(-1);
  f.store.completeJob(job.id,{summary:'用户更正绿茶，但待确认',memories:[{key:'beverage.preference',layer:'profile',kind:'fact',source_entry_id:u.id,quote:u.text}]});
  assert.equal(f.store.state.memories.length,2);assert.equal(f.store.state.memories[1].status,'pending_confirmation');
});
test('ordinary likes coexist with a favorite and only the old favorite is replaced',t=>{
  const f=fixture(t);const red=save(f,'请记住，我最喜欢喝红茶');const coffee=save(f,'请记住，我也喜欢喝咖啡');assert.equal(coffee.status,'saved');
  const green=save(f,'不，请记住，我现在最喜欢喝绿茶','beverage.favorite','我现在最喜欢喝绿茶');const offer=question(f,green);
  assert.deepEqual(offer.offer.expectedIds,[red.memoryId]);assert.doesNotMatch(offer.offer.question,/咖啡/);
  assert.equal(resolve(f,offer,'确认更新').status,'saved');assert.equal(f.store.state.memories.find(m=>m.id===coffee.memoryId).status,'confirmed');
  assert.match(f.store.favoriteDrinkReply('我最喜欢喝什么茶？'),/绿茶/);
});
test('confirming a plain like never silently promotes it to favorite',t=>{
  const f=fixture(t);save(f,'请记住，我最喜欢喝红茶');const c=save(f,'不，请记住，我现在喜欢喝绿茶','drink.favorite','我现在喜欢喝绿茶');
  const offer=question(f,c);assert.equal(resolve(f,offer,'确认更新').status,'saved');
  assert.equal(f.store.state.memories.at(-1).preferenceKind,'like');assert.match(f.store.favoriteDrinkReply('我最喜欢喝什么茶'),/没有明确确认/);
});
test('legacy alias records participate in conflict detection without a destructive migration',t=>{
  const f=fixture(t),red=save(f,'请记住，我最喜欢喝红茶');f.store.commit(s=>{s.memories[0].key='drink.favorite';delete s.memories[0].preferenceKind;delete s.memories[0].correction;});
  const c=save(f,'请记住，我现在最喜欢喝绿茶');assert.equal(c.status,'pending_confirmation');assert.deepEqual(question(f,c).offer.expectedIds,[red.memoryId]);assert.equal(f.store.state.memories[0].key,'drink.favorite');
});
test('interrupted negative decision with a follow-up keeps old favorite and answers it once',t=>{
  const f=fixture(t);save(f,'请记住，我最喜欢喝红茶');const tools=new MemoryTools(f.store,f.h);tools.userStarted();
  f.h.user('请记住，我现在最喜欢喝乌龙茶');tools.userCompleted();
  tools.handle({name:'remember_user_fact',call_id:'c',arguments:JSON.stringify({key:'drink.favorite',layer:'profile',quote:'我现在最喜欢喝乌龙茶'})});
  const offered=tools.currentOffer;f.store.bindConfirmation(offered.memoryId,offered.offer.token,'q');
  f.h.output({type:'response.output_text.done',response_id:'q',text:offered.offer.question},{source:'local_memory'});f.h.playback('q','started');f.h.interrupt();
  tools.userStarted();f.h.user('现不改。那我目前最喜欢喝的是什么茶？');tools.userCompleted();const result=tools.reply();
  assert.equal(result.status,'deferred_confirmation');assert.match(memorySpeech(result),/先不改.*红茶/);assert.doesNotMatch(memorySpeech(result),/乌龙茶/);
  assert.equal(f.store.state.memories.at(-1).lastOffer.resolved,'defer');assert.equal(f.store.state.memories.at(-1).status,'pending_confirmation');
  assert.equal(f.h.session.entries.find(e=>e.responseId==='q').playback,'interrupted');assert.ok(f.h.session.entries.find(e=>e.responseId==='q').playbackInterruptedAt);
});
test('a negative decision can interrupt but a positive replacement still requires completed playback',t=>{
  for(const [reply,status] of [['保留原来的','kept_existing'],['确认更新','rejected']]){
    const f=fixture(t);save(f,'请记住，我最喜欢喝红茶');const c=save(f,'请记住，我最喜欢喝绿茶');const offer=question(f,c,'interrupted');
    assert.equal(resolve(f,offer,reply).status,status);assert.equal(f.store.state.memories[0].status,'confirmed');
  }
});
test('compound questions and quoted or hypothetical decisions do not grant replacement approval',()=>{
  assert.equal(confirmationReply('先不改，那我最喜欢喝什么茶？').decision,'defer');
  assert.equal(confirmationReply('先不。').decision,'defer');assert.equal(confirmationReply('暂时不要。').decision,'defer');
  for(const text of ['确认更新，那我最喜欢喝什么茶？','先不改吗？那我最喜欢喝什么茶？','如果先不改，那我最喜欢喝什么茶？','他说“先不改”，我最喜欢喝什么茶？','先不改，还是确认更新吧'])assert.equal(confirmationReply(text),null,text);
});
test('retrieval of ordinary likes does not invent a favorite, and unrelated questions stay conversational',t=>{
  const f=fixture(t);save(f,'请记住，我喜欢喝绿茶');assert.match(f.store.favoriteDrinkReply('我最喜欢喝什么茶'),/没有明确确认/);
  assert.equal(f.store.favoriteDrinkReply('什么是 Java 接口'),null);assert.equal(f.store.favoriteDrinkReply('如果我最喜欢喝茶会怎样'),null);
  assert.equal(f.store.search('喜欢喝什么').memories[0].preferenceKind,'like');
});
test('legacy contradictory confirmed records are reported as uncertain without altering evidence',t=>{
  const f=fixture(t);save(f,'请记住，我最喜欢喝红茶');save(f,'不，请记住，我现在喜欢喝的是绿茶。');
  f.store.commit(s=>{s.memories[0].key='drink.favorite';s.memories[1].status='confirmed';for(const m of s.memories){delete m.preferenceKind;delete m.correction;}});
  const revision=f.store.state.revision;assert.match(f.store.favoriteDrinkReply('我最喜欢喝什么茶？'),/暂时不能确定/);assert.equal(f.store.state.revision,revision);
});
test('unrecognized negative ASR plus a readable question does not fabricate a decision or lose the answer',t=>{
  const f=fixture(t);save(f,'请记住，我最喜欢喝绿茶');const tools=new MemoryTools(f.store,f.h);tools.userStarted();f.h.user('请记住，我最喜欢喝乌龙茶');tools.userCompleted();
  tools.handle({name:'remember_user_fact',call_id:'unclear',arguments:JSON.stringify({key:'drink.favorite',layer:'profile',quote:'我最喜欢喝乌龙茶'})});
  const offered=tools.currentOffer;f.store.bindConfirmation(offered.memoryId,offered.offer.token,'q');f.h.output({type:'response.output_text.done',response_id:'q',text:offered.offer.question},{source:'local_memory'});f.h.interrupt();
  tools.userStarted();f.h.user('心不改，那我目前最喜欢喝的是什么茶？');tools.userCompleted();const result=tools.reply();
  assert.equal(result.status,'unconfirmed');assert.match(memorySpeech(result),/没有完成确认.*绿茶/);assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories[1].status,'pending_confirmation');assert.equal(f.store.state.memories[1].decisions[0].decision,'unclear');
});
