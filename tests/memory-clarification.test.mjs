import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {MemoryStore,HistoryRecorder} from '../prototypes/memory/store.mjs';
import {MemoryTools} from '../prototypes/memory/tools.mjs';
import {ambiguousConfirmation,confirmationDecision} from '../prototypes/memory/policy.mjs';
function fixture(t,initialPlayback='completed'){
 const root=mkdtempSync(join(tmpdir(),'jarvis-clarify-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const store=new MemoryStore(root),h=new HistoryRecorder(store,'manual');
 const save=text=>{const u=h.user('请记住，'+text);return store.remember(h.session.id,{key:'preference.drink',layer:'profile',source_entry_id:u.id,quote:text},u.id);};
 save('我最喜欢红茶');const pending=save('我现在最喜欢绿茶'),tools=new MemoryTools(store,h);tools.currentOffer=tools.offer(pending,true);
 const heard=(offer,playback='completed')=>{const id=offer.offer.token;store.bindConfirmation(pending.memoryId,offer.offer.token,id);h.output({type:'response.output_text.done',response_id:id,text:offer.offer.question},{source:'local_memory'});h.playback(id,playback);};
 const reply=text=>{tools.userStarted();h.user(text);tools.userCompleted();return tools.reply();};heard(tools.currentOffer,initialPlayback);
 return {root,store,h,tools,pending,heard,reply,save};
}
test('misrecognized question asks once, then an explicit followup commits against the newly heard question',t=>{
 const f=fixture(t),old=f.tools.currentOffer;const result=f.reply('对的，请保存吗？');assert.equal(result.status,'confirmation_required');assert.notEqual(result.offer.token,old.offer.token);assert.equal(f.store.state.memories[0].status,'confirmed');assert.equal(f.store.state.memories[1].status,'pending_confirmation');
 f.heard(result);assert.equal(f.reply('你可以保存新的了。').status,'saved');assert.equal(f.store.state.memories[0].status,'superseded');assert.equal(f.store.state.memories[1].status,'confirmed');assert.equal(f.store.state.memories[1].decisions[0].source.quote,'你可以保存新的了。');
 assert.equal(new MemoryStore(f.root,{recover:false}).state.memories[1].status,'confirmed');
});
test('a second ambiguous answer remains pending and does not create a third question',t=>{const f=fixture(t),first=f.reply('对的，请保存吗？');f.heard(first);assert.equal(f.reply('请保存吗？').status,'unconfirmed');assert.equal(f.tools.currentOffer,null);assert.equal(f.store.state.memories[1].clarifications.length,1);assert.equal(f.reply('确认更新'),null);assert.equal(f.store.state.memories[1].status,'pending_confirmation');});
test('an unrelated turn cancels the clarification window and a later yes cannot update memory',t=>{const f=fixture(t),first=f.reply('请保存吗？');f.heard(first);assert.equal(f.reply('聊聊游戏吧'),null);assert.equal(f.reply('你可以保存新的了'),null);assert.equal(f.store.state.memories[0].status,'confirmed');});
test('interrupted clarification, stale token and changed replacement scope cannot commit',t=>{
 const f=fixture(t),old=f.tools.currentOffer,first=f.reply('对对，请保存吗？');f.heard(first,'interrupted');assert.equal(f.reply('对的，请保存吧。').status,'rejected');assert.equal(f.store.state.memories[0].status,'confirmed');
 assert.equal(f.store.resolveConfirmation(f.pending.memoryId,old.offer.token,f.h.session.id,f.h.currentUser).status,'rejected');
 const other=fixture(t);other.store.commit(s=>{s.memories[0].status='superseded';});assert.equal(other.reply('请保存吗？').status,'stale');
});
test('negative answer to clarification keeps original fact and no new question follows',t=>{const f=fixture(t),first=f.reply('对的，请保存吗？');f.heard(first);assert.equal(f.reply('先不改').status,'deferred_confirmation');assert.equal(f.tools.currentOffer,null);assert.equal(f.store.state.memories[0].status,'confirmed');});
test('question-like approvals stay ambiguous; broadening clear followups does not accept negatives or quoted text',()=>{
 for(const s of ['对的，请保存吗？','对对，请保存吗？','请保存吗？','你可以保存新的了吗？']){assert.equal(confirmationDecision(s),null,s);assert.equal(ambiguousConfirmation(s),true,s);}
 for(const s of ['对的，请保存吧。','你可以保存新的了。','可以保存新的了'])assert.equal(confirmationDecision(s),'accept',s);
 for(const s of ['不要保存','你可以不保存新的了','你可以保存新的了，然后删掉旧项目','他说“你可以保存新的了”','如果你可以保存新的了','请保存游戏吗？']){assert.equal(confirmationDecision(s),null,s);assert.equal(ambiguousConfirmation(s),false,s);}
});
test('a write failure during clarification leaves original offer and memory intact',t=>{const f=fixture(t),before=structuredClone(f.store.state);const write=f.store.write;f.store.write=(p,v)=>{if(p.endsWith('memory.json'))throw new Error('disk');write(p,v);};assert.equal(f.reply('请保存吗？').status,'failed');assert.deepEqual(f.store.state,before);});

test('an interrupted original question can be clarified once without approving until the new question is heard',t=>{const f=fixture(t,'interrupted');const clarification=f.reply('请保存吗？');assert.equal(clarification.status,'confirmation_required');assert.equal(f.store.state.memories[1].status,'pending_confirmation');f.heard(clarification);assert.equal(f.reply('确认更新').status,'saved');});
