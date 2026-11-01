import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MemoryStore,HistoryRecorder} from '../prototypes/memory/store.mjs';
import {drinkFactEquivalence,confirmationDecision} from '../prototypes/memory/policy.mjs';

function fixture(t){const root=mkdtempSync(join(tmpdir(),'jarvis-equivalence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const store=new MemoryStore(root);return {root,store,h:new HistoryRecorder(store,'manual')};}
function save(f,quote,{source='请记住，'+quote,key='preference.drink',layer='profile'}={}){const u=f.h.user(source);return f.store.remember(f.h.session.id,{key,layer,source_entry_id:u.id,quote},u.id);}
function extract(f,source,quote,{kind='fact',layer='profile'}={}){const h=new HistoryRecorder(f.store,'manual'),u=h.user(source);h.end('test');const job=f.store.nextJob();f.store.startJob(job.id);f.store.completeJob(job.id,{summary:'',memories:[{key:'preference.drink',kind,layer,source_entry_id:u.id,quote}]});}

test('actual extracted red-tea wording and explicit restatement share the original fact and retain both sources',t=>{
  const f=fixture(t);extract(f,'请对主，我最喜欢喝的是红茶。','我最喜欢喝的是红茶。');
  const before=structuredClone(f.store.state.memories[0]),result=save(f,'我最喜欢喝红茶');
  assert.equal(result.status,'already_saved');assert.equal(result.memoryId,before.id);assert.equal(f.store.state.memories.length,1);
  assert.equal(f.store.state.memories[0].text,before.text);assert.equal(f.store.state.memories[0].sources.length,2);assert.equal(f.store.state.memories[0].lastOffer,undefined);
  assert.equal(new MemoryStore(f.root,{recover:false}).state.memories[0].sources.length,2);
});

test('finite copula variants work across drink key aliases but not drink names or strengths',t=>{
  const f=fixture(t);const old=save(f,'我最喜欢喝的是红茶。',{key:'drink.favorite'});
  assert.equal(save(f,'我最喜欢的是红茶',{key:'beverage.preference'}).memoryId,old.memoryId);
  assert.equal(save(f,'我最喜欢喝的就是红茶').status,'already_saved');
  assert.equal(save(f,'我最喜欢喝绿茶').status,'pending_confirmation');
  assert.equal(save(f,'我只喜欢喝红茶').status,'pending_confirmation');
  assert.equal(save(f,'我喜欢喝红茶').status,'saved');
  assert.equal(f.store.state.memories[0].status,'confirmed');
});

test('qualified or compound drink facts stay outside semantic merging even when the quote drops qualifiers',t=>{
  for(const source of ['请记住，今天我最喜欢喝红茶','请记住，以前我最喜欢喝红茶','请记住，我不认为我最喜欢喝红茶','请记住，如果我最喜欢喝红茶','请记住，我最喜欢喝红茶和绿茶','请记住，在家我最喜欢喝红茶','请记住，我最喜欢喝红茶吗？']){
    const f=fixture(t);save(f,'我最喜欢喝的是红茶');const candidate=save(f,'我最喜欢喝红茶',{source});
    assert.equal(candidate.status,'pending_confirmation',source);assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories.length,2);
  }
});

test('a qualifier dropped from an old extracted quote still prevents merging',t=>{
  const f=fixture(t);extract(f,'以前我最喜欢喝的是红茶','我最喜欢喝的是红茶');
  assert.equal(save(f,'我最喜欢喝红茶').status,'pending_confirmation');assert.equal(f.store.state.memories.length,2);
});

test('observation and layer boundaries do not become confirmed through equivalent wording',t=>{
  const f=fixture(t);extract(f,'我最喜欢喝的是红茶','我最喜欢喝的是红茶',{kind:'observation'});
  assert.equal(f.store.state.memories[0].status,'pending_confirmation');assert.equal(save(f,'我最喜欢喝红茶').status,'saved');assert.equal(f.store.state.memories.length,2);
  const other=fixture(t);save(other,'我最喜欢喝的是红茶',{layer:'cross_session'});
  assert.equal(save(other,'我最喜欢喝红茶',{layer:'profile'}).status,'pending_confirmation');
});

test('missing original provenance cannot justify a semantic merge',t=>{
  const f=fixture(t);save(f,'我最喜欢喝的是红茶');f.store.commit(s=>{s.memories[0].sources[0].sessionId='missing-test-source';});
  assert.equal(save(f,'我最喜欢喝红茶').status,'pending_confirmation');
});

test('bounded parser leaves unknown beverages, inference, corrections and quoted speech unchanged',()=>{
  const memory={key:'preference.drink',kind:'fact',text:'我最喜欢喝的是红茶'};
  assert.equal(drinkFactEquivalence(memory,'我最喜欢喝的是红茶'),'preference.drink|favorite|红茶');
  for(const text of ['我最喜欢喝温红茶','我最喜欢喝某牌茶','他说“我最喜欢喝的是红茶”','我最近最喜欢喝的是红茶'])assert.equal(drinkFactEquivalence({...memory,text},text),null,text);
  assert.equal(drinkFactEquivalence({...memory,kind:'observation'},memory.text),null);
  assert.equal(drinkFactEquivalence({...memory,correction:true},memory.text),null);
  assert.equal(drinkFactEquivalence({...memory,preferenceKind:'like'},memory.text),null);
});

test('complete repeated assent with save is accepted, but questions, negation and compound instructions are not',()=>{
  for(const text of ['对对，请保存吧。','对，请保存。','对对对，保存吧'])assert.equal(confirmationDecision(text),'accept',text);
  for(const text of ['对对，请保存吗','对对，请保存吧？','对对，请不要保存吧','他说“对对，请保存吧”','如果我说对对，请保存吧','对对，请保存吧，然后改成绿茶','对对，请保存红茶吧'])assert.equal(confirmationDecision(text),null,text);
});

test('new affirmative form only commits after the current question was fully played and a final user entry exists',t=>{
  for(const playback of ['completed','interrupted']){
    const f=fixture(t);save(f,'我最喜欢喝红茶');const pending=save(f,'我最喜欢喝绿茶');
    const offer=f.store.offerConfirmation(pending.memoryId,f.h.session.id,f.h.currentUser,{explicit:true});f.store.bindConfirmation(pending.memoryId,offer.offer.token,'heard');
    f.h.output({type:'response.output_text.done',response_id:'heard',text:offer.offer.question},{source:'local_memory'});f.h.playback('heard',playback);
    // Partial ASR has no user entry and cannot resolve the outstanding offer.
    assert.equal(f.store.resolveConfirmation(pending.memoryId,offer.offer.token,f.h.session.id,f.h.currentUser).status,'rejected');
    const u=f.h.user('对对，请保存吧。');const result=f.store.resolveConfirmation(pending.memoryId,offer.offer.token,f.h.session.id,u.id);
    assert.equal(result.status,playback==='completed'?'saved':'rejected');
    assert.equal(f.store.state.memories[0].status,playback==='completed'?'superseded':'confirmed');
  }
});
