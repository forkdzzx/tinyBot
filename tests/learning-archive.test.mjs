import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LearningArchive} from '../prototypes/learning/archive.mjs';
import {atomicJSON} from '../prototypes/memory/store.mjs';

function fixture(t,options){const root=mkdtempSync(join(tmpdir(),'jarvis-learning-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return {root,archive:new LearningArchive(root,options)};}
const lesson=(id='lesson-1')=>({id,sessionId:'chat-1',startedAt:'2026-11-01T12:00:00.000Z',endedAt:'2026-11-01T12:02:00.000Z',reason:'explicit_end',entries:[
  {id:'assistant-1',role:'assistant',text:'What do you have for breakfast?'},
  {id:'user-1',role:'user',text:'I eats eggs.'},
]});
const report=()=>({vocabulary:[{word:'breakfast',meaning:'早餐',entryId:'assistant-1',quote:'have for breakfast'}],corrections:[{entryId:'user-1',quote:'I eats eggs.',suggestion:'I eat eggs.',explanation:'主语 I 搭配 eat。'}]});
function running(archive,segment=lesson()){archive.queue(segment);archive.begin(segment.id);return segment.id;}

test('queue is idempotent and all inputs and exposed snapshots are detached',t=>{
  const {archive,root}=fixture(t),input=lesson();archive.queue(input);input.entries[1].text='Mutated input';
  const first=archive.get('lesson-1');first.entries[0].text='Mutated get';archive.pending()[0].entries.length=0;
  assert.equal(archive.get('lesson-1').entries[1].text,'I eats eggs.');
  assert.equal(archive.queue(lesson()).status,'queued');assert.equal(archive.state.segments.length,1);
  const reordered=lesson();reordered.entries=reordered.entries.map(e=>({text:e.text,role:e.role,id:e.id}));assert.equal(archive.queue(reordered).status,'queued');
  const changed=lesson();changed.entries[1].text='Other reply';assert.throws(()=>archive.queue(changed),/learning_segment_id_conflict/);
  const reloaded=new LearningArchive(root);assert.equal(reloaded.pending().length,1);assert.equal(reloaded.progress().segmentCount,0);
});

test('empty or assistant-only segments do not queue or count practice',t=>{
  const {archive}=fixture(t);const empty=lesson();empty.entries=[];assert.equal(archive.queue(empty),null);
  empty.entries=[{id:'assistant-only',role:'assistant',text:'Hello!'}];assert.equal(archive.queue(empty),null);
  assert.equal(existsSync(archive.path),false);assert.equal(archive.progress().userTurnCount,0);
});

test('segment bounds, duplicate references and unknown fields fail without changing storage',t=>{
  const {archive}=fixture(t);
  const variants=[
    {...lesson(),entries:Array.from({length:81},(_,i)=>({id:'u'+i,role:'user',text:'Hi'}))},
    {...lesson(),entries:[{id:'u',role:'user',text:'x'.repeat(2001)}]},
    {...lesson(),entries:Array.from({length:11},(_,i)=>({id:'u'+i,role:'user',text:'x'.repeat(2000)}))},
    {...lesson(),entries:[{id:'u',role:'user',text:'Hi'},{id:'u',role:'assistant',text:'Hi'}]},
    {...lesson(),entries:[{id:'u',role:'system',text:'hidden rules'}]},
    {...lesson(),entries:[{id:'u',role:'user',text:'   '}]},
    {...lesson(),execute:'shell'},
    {...lesson(),endedAt:'2026-10-01T12:00:00.000Z'},
  ];
  for(const item of variants)assert.throws(()=>archive.queue(item),/learning_/);
  assert.equal(archive.state.segments.length,0);assert.equal(existsSync(archive.path),false);
});

test('completed report retains exact evidence and reloads without duplicating progress',t=>{
  const {archive,root}=fixture(t);const id=running(archive),input=report(),done=archive.complete(id,input);input.vocabulary[0].word='other';done.report.corrections.length=0;
  const stored=archive.get(id);assert.equal(stored.report.corrections.length,1);assert.equal(stored.report.vocabulary[0].word,'breakfast');
  assert.equal(stored.report.sourceSessionId,'chat-1');assert.deepEqual(stored.report.sourceEntryIds,['assistant-1','user-1']);
  const reloaded=new LearningArchive(root);assert.equal(reloaded.queue(lesson()).status,'done');assert.equal(reloaded.begin(id),null);
  assert.deepEqual(reloaded.progress(),{segmentCount:1,userTurnCount:1,vocabulary:['breakfast'],correctionCount:1,interpretation:'exposure_and_transcript_suggestions_not_mastery_or_proficiency'});
  assert.throws(()=>reloaded.complete(id,report()),/learning_not_running/);
});

test('result rejects missing or invented sources and assistant speech cannot become a learner error',t=>{
  const {archive}=fixture(t),id=running(archive);
  const variants=[
    {vocabulary:[{...report().vocabulary[0],entryId:'missing'}],corrections:[]},
    {vocabulary:[{...report().vocabulary[0],quote:'a phrase never said'}],corrections:[]},
    {vocabulary:[{...report().vocabulary[0],word:'dinner'}],corrections:[]},
    {vocabulary:[{...report().vocabulary[0],word:'fast'}],corrections:[]},
    {vocabulary:[],corrections:[{...report().corrections[0],entryId:'assistant-1',quote:'What do you have'}]},
    {vocabulary:[],corrections:[{...report().corrections[0],quote:'I eated eggs.'}]},
  ];
  for(const value of variants){assert.throws(()=>archive.complete(id,value),/learning_/);assert.equal(archive.get(id).status,'running');assert.equal(archive.get(id).report,undefined);}
  assert.equal(archive.progress().segmentCount,0);
});

test('case, punctuation and identical wording do not become speaking errors, while real suggestions remain sourced',t=>{
  const {archive}=fixture(t),segment=lesson();segment.entries[1].text="what's your name";running(archive,segment);
  const done=archive.complete(segment.id,{vocabulary:[],corrections:[{entryId:'user-1',quote:"what's your name",suggestion:"What's your name?",explanation:'Capitalization and question mark.'}]});
  assert.equal(done.report.corrections.length,0);assert.deepEqual(done.report.omittedCorrections,[{entryId:'user-1',reason:'case_or_punctuation_only'}]);
  assert.equal(archive.progress().correctionCount,0);
});

test('arbitrary summaries, ratings, oversized fields and malformed collections cannot be archived',t=>{
  const {archive}=fixture(t),id=running(archive);
  for(const result of [
    {...report(),summary:'User mastered breakfast'},
    {...report(),proficiency:'C2'},
    {vocabulary:Array(4).fill(report().vocabulary[0]),corrections:[]},
    {vocabulary:[],corrections:Array(4).fill(report().corrections[0])},
    {vocabulary:[{...report().vocabulary[0],meaning:'x'.repeat(161)}],corrections:[]},
    {vocabulary:[],corrections:[{...report().corrections[0],explanation:'x'.repeat(301)}]},
    {vocabulary:null,corrections:[]},
  ])assert.throws(()=>archive.complete(id,result),/learning_/);
  archive.complete(id,{vocabulary:[],corrections:[]});assert.equal(archive.get(id).status,'done');
});

test('duplicate extracted items and repeated user entry references do not inflate exposure counts',t=>{
  const {archive}=fixture(t);running(archive);const r=report();r.vocabulary.push({...r.vocabulary[0]});r.corrections.push({...r.corrections[0]});archive.complete('lesson-1',r);
  running(archive,lesson('lesson-2'));archive.complete('lesson-2',report());
  assert.equal(archive.get('lesson-1').report.vocabulary.length,1);assert.equal(archive.get('lesson-1').report.corrections.length,1);
  assert.equal(archive.progress().userTurnCount,1);assert.deepEqual(archive.progress().vocabulary,['breakfast']);
  assert.equal(archive.progress().correctionCount,1);
});

test('chunks of the same original user turn count once across segment boundaries',t=>{
  const {archive}=fixture(t),first=lesson('chunk-1'),second=lesson('chunk-2');
  first.entries=[{id:'f1e2:0',role:'user',text:'I like breakfast.'}];second.entries=[{id:'f1e2:2000',role:'user',text:'And I like lunch.'}];
  for(const segment of [first,second]){running(archive,segment);archive.complete(segment.id,{vocabulary:[],corrections:[]});}
  assert.equal(archive.progress().segmentCount,2);assert.equal(archive.progress().userTurnCount,1);
  const next=lesson('another-session');next.sessionId='chat-2';next.entries=[{id:'f1e2',role:'user',text:'Hello again.'}];running(archive,next);archive.complete(next.id,{vocabulary:[],corrections:[]});assert.equal(archive.progress().userTurnCount,2);
});

test('failed work is retried at most once and errors remain visible without counting a report',t=>{
  const {archive}=fixture(t);running(archive);assert.equal(archive.begin('lesson-1'),null);
  assert.equal(archive.fail('lesson-1','learning_network_error').status,'queued');assert.equal(archive.pending().length,1);
  assert.equal(archive.begin('lesson-1').attempts,2);const failed=archive.fail('lesson-1','learning_invalid_source');
  assert.equal(failed.status,'failed');assert.equal(failed.errors.length,2);assert.equal(archive.pending().length,0);assert.equal(archive.begin('lesson-1'),null);assert.equal(archive.progress().segmentCount,0);
});

test('restart recovers interrupted work without resetting attempts or allowing endless retries',t=>{
  const {archive,root}=fixture(t);running(archive);const retry=new LearningArchive(root);
  assert.equal(retry.get('lesson-1').status,'queued');assert.equal(retry.get('lesson-1').error,'learning_process_interrupted');retry.begin('lesson-1');
  const exhausted=new LearningArchive(root);assert.equal(exhausted.get('lesson-1').status,'failed');assert.equal(exhausted.get('lesson-1').attempts,2);assert.equal(exhausted.pending().length,0);
});

test('a failed write does not publish queued or completed state, and the previous file survives a partial temp write',t=>{
  let broken=true;const {archive,root}=fixture(t,{write:(path,value)=>{if(broken){writeFileSync(path+'.incomplete','partial');throw new Error('disk');}atomicJSON(path,value);}});
  assert.throws(()=>archive.queue(lesson()),/disk/);assert.equal(archive.get('lesson-1'),null);assert.equal(existsSync(archive.path),false);
  broken=false;running(archive);const before=readFileSync(archive.path,'utf8'),state=structuredClone(archive.state);broken=true;
  assert.throws(()=>archive.complete('lesson-1',report()),/disk/);assert.deepEqual(archive.state,state);assert.equal(readFileSync(archive.path,'utf8'),before);assert.equal(archive.progress().segmentCount,0);
  const recovered=new LearningArchive(root);assert.equal(recovered.get('lesson-1').status,'queued');assert.equal(recovered.get('lesson-1').report,undefined);
});

test('invalid saved JSON is preserved and never silently replaced with an empty learning record',t=>{
  const {archive,root}=fixture(t);writeFileSync(archive.path,'{"schemaVersion":1,"segments":[');
  const original=readFileSync(archive.path,'utf8');assert.throws(()=>new LearningArchive(root),/learning_invalid_archive_preserve_file/);assert.equal(readFileSync(archive.path,'utf8'),original);
});

test('corrupted completed evidence and arbitrary persisted summaries fail without rewriting the file',t=>{
  const {archive,root}=fixture(t);running(archive);archive.complete('lesson-1',report());
  const original=structuredClone(archive.state);
  for(const mutate of [state=>{state.segments[0].report.summary='Mastered English';},state=>{state.segments[0].report.sourceSessionId='other';},state=>{state.segments[0].report.corrections[0].entryId='assistant-1';},state=>{state.segments[0].attempts=0;}]){
    const edited=structuredClone(original);mutate(edited);writeFileSync(archive.path,JSON.stringify(edited));const before=readFileSync(archive.path,'utf8');
    assert.throws(()=>new LearningArchive(root),/learning_invalid_archive_preserve_file/);assert.equal(readFileSync(archive.path,'utf8'),before);
  }
});
