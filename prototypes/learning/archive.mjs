import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {atomicJSON} from '../memory/store.mjs';

const now=()=>new Date().toISOString();
const fail=code=>{throw new Error(code);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(value);
const timestamp=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const errorCode=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{1,79}$/.test(value);
const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const segmentKeys=['id','sessionId','startedAt','endedAt','reason','entries'];

function validateSegment(value){
  if(!keys(value,segmentKeys)||!id(value.id)||!id(value.sessionId)||
    !timestamp(value.startedAt)||!timestamp(value.endedAt)||Date.parse(value.endedAt)<Date.parse(value.startedAt)||
    typeof value.reason!=='string'||!/[a-z]/.test(value.reason)||!/^[a-z_]{1,48}$/.test(value.reason)||
    !Array.isArray(value.entries)||value.entries.length>80)fail('learning_invalid_segment');
  const seen=new Set();let length=0;
  for(const entry of value.entries){
    if(!keys(entry,['id','role','text'])||!id(entry.id)||seen.has(entry.id)||!['user','assistant'].includes(entry.role)||!text(entry.text,2000))fail('learning_invalid_entry');
    seen.add(entry.id);length+=entry.text.length;
  }
  if(length>20000)fail('learning_segment_budget');
  return {id:value.id,sessionId:value.sessionId,startedAt:value.startedAt,endedAt:value.endedAt,reason:value.reason,
    entries:value.entries.map(entry=>({id:entry.id,role:entry.role,text:entry.text}))};
}
function sourceFor(segment,item,role){
  const entry=segment.entries.find(entry=>entry.id===item.entryId);
  if(!entry||(role&&entry.role!==role)||!text(item.quote,400)||!entry.text.includes(item.quote))fail('learning_invalid_source');
  return entry;
}
function vocabularyItem(segment,item){
  if(!keys(item,['word','meaning','entryId','quote'])||!text(item.word,80)||!text(item.meaning,160)||!id(item.entryId)||
    !/^[A-Za-z]+(?:['’\-][A-Za-z]+)*(?: [A-Za-z]+(?:['’\-][A-Za-z]+)*){0,5}$/.test(item.word))fail('learning_invalid_vocabulary');
  sourceFor(segment,item);
  const escaped=item.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`).test(item.quote))fail('learning_word_not_in_source');
  return structuredClone(item);
}
function validateResult(segment,result){
  if(!keys(result,['vocabulary','corrections'])||!Array.isArray(result.vocabulary)||result.vocabulary.length>3||!Array.isArray(result.corrections)||result.corrections.length>3)fail('learning_invalid_result');
  const vocabulary=[],corrections=[],omittedCorrections=[];
  const words=new Set(),suggestions=new Set();
  for(const item of result.vocabulary){
    const value=vocabularyItem(segment,item),word=value.word.toLowerCase();
    if(!words.has(word)){words.add(word);vocabulary.push(value);}
  }
  for(const item of result.corrections){
    if(!keys(item,['entryId','quote','suggestion','explanation'])||!id(item.entryId)||!text(item.suggestion,400)||!text(item.explanation,300))fail('learning_invalid_correction');
    sourceFor(segment,item,'user');
    if(normalize(item.quote)===normalize(item.suggestion)){
      omittedCorrections.push({entryId:item.entryId,reason:'case_or_punctuation_only'});continue;
    }
    const key=JSON.stringify([item.entryId,item.quote,item.suggestion]);
    if(!suggestions.has(key)){suggestions.add(key);corrections.push(structuredClone(item));}
  }
  return {segmentId:segment.id,sourceSessionId:segment.sessionId,sourceEntryIds:segment.entries.map(e=>e.id),
    basis:'transcript_suggestions_not_audio_assessment',vocabulary,corrections,omittedCorrections};
}

export class LearningArchive {
  constructor(root,{write=atomicJSON,recover=true}={}){
    this.path=join(root,'learning.json');this.write=write;mkdirSync(root,{recursive:true,mode:0o700});
    try{
      this.state=existsSync(this.path)?JSON.parse(readFileSync(this.path,'utf8')):{schemaVersion:1,segments:[]};
      if(!keys(this.state,['schemaVersion','segments'])||this.state.schemaVersion!==1||!Array.isArray(this.state.segments))throw new Error();
      const ids=new Set();
      for(const segment of this.state.segments){
        if(!keys(segment,[...segmentKeys,'status','attempts','report','error','errors','completedAt'])||ids.has(segment.id)||!['queued','running','done','failed'].includes(segment.status)||!Number.isInteger(segment.attempts)||segment.attempts<0||segment.attempts>2)throw new Error();
        validateSegment(Object.fromEntries(segmentKeys.map(key=>[key,segment[key]])));ids.add(segment.id);
        if(segment.status==='queued'&&segment.attempts>=2||segment.status!=='queued'&&segment.attempts===0||segment.status==='failed'&&segment.attempts!==2)throw new Error();
        if(segment.error!==undefined&&!errorCode(segment.error))throw new Error();
        if(segment.errors!==undefined&&(!Array.isArray(segment.errors)||segment.errors.length>2||segment.errors.some(e=>!keys(e,['code','at','attempt'])||!errorCode(e.code)||!timestamp(e.at)||![1,2].includes(e.attempt))))throw new Error();
        if(segment.status==='done'){
          const report=segment.report;
          if(!keys(report,['segmentId','sourceSessionId','sourceEntryIds','basis','vocabulary','corrections','omittedCorrections'])||!timestamp(segment.completedAt)||segment.error!==undefined)throw new Error();
          const checked=validateResult(segment,{vocabulary:report.vocabulary,corrections:report.corrections});
          for(const key of ['segmentId','sourceSessionId','sourceEntryIds','basis','vocabulary','corrections'])if(JSON.stringify(report[key])!==JSON.stringify(checked[key]))throw new Error();
          if(!Array.isArray(report.omittedCorrections)||report.omittedCorrections.length>3||report.omittedCorrections.some(item=>!keys(item,['entryId','reason'])||item.reason!=='case_or_punctuation_only'||!segment.entries.some(e=>e.id===item.entryId&&e.role==='user')))throw new Error();
        }else if(segment.report!==undefined||segment.completedAt!==undefined)throw new Error();
      }
    }catch{fail('learning_invalid_archive_preserve_file');}
    if(recover&&this.state.segments.some(s=>s.status==='running'))this.commit(state=>{
      for(const segment of state.segments)if(segment.status==='running'){
        segment.status=segment.attempts>=2?'failed':'queued';segment.error='learning_process_interrupted';
        (segment.errors??=[]).push({code:segment.error,at:now(),attempt:segment.attempts});
      }
    });
  }
  commit(change){const next=structuredClone(this.state);change(next);this.write(this.path,next);this.state=next;}
  get(id){const value=this.state.segments.find(s=>s.id===id);return value?structuredClone(value):null;}
  queue(input){
    const segment=validateSegment(input),existing=this.get(segment.id);
    if(existing){
      if(segmentKeys.some(key=>JSON.stringify(existing[key])!==JSON.stringify(segment[key])))fail('learning_segment_id_conflict');
      return existing;
    }
    if(!segment.entries.some(entry=>entry.role==='user'))return null;
    this.commit(state=>state.segments.push({...segment,status:'queued',attempts:0}));return this.get(segment.id);
  }
  pending(){return this.state.segments.filter(s=>s.status==='queued'&&s.attempts<2).map(s=>structuredClone(s));}
  begin(id){
    const segment=this.get(id);if(!segment||segment.status!=='queued'||segment.attempts>=2)return null;
    this.commit(state=>{const target=state.segments.find(s=>s.id===id);target.status='running';target.attempts++;});return this.get(id);
  }
  complete(id,result){
    const segment=this.get(id);if(!segment||segment.status!=='running')fail('learning_not_running');
    const report=validateResult(segment,result);
    this.commit(state=>{const target=state.segments.find(s=>s.id===id);target.status='done';target.report=report;target.completedAt=now();delete target.error;});return this.get(id);
  }
  fail(id,code){
    const segment=this.get(id);if(!segment||segment.status!=='running')fail('learning_not_running');
    const error=errorCode(code)?code:'learning_processing_failed';
    this.commit(state=>{const target=state.segments.find(s=>s.id===id);target.status=target.attempts<2?'queued':'failed';target.error=error;(target.errors??=[]).push({code:error,at:now(),attempt:target.attempts});});return this.get(id);
  }
  progress(){
    const complete=this.state.segments.filter(s=>s.status==='done'),turns=new Set(),words=new Map(),suggestions=new Set();
    for(const segment of complete){
      // The tracker uses UUID:offset for chunks of one long original entry.
      for(const entry of segment.entries)if(entry.role==='user')turns.add(`${segment.sessionId}:${entry.id.split(':')[0]}`);
      for(const item of segment.report.vocabulary)if(!words.has(item.word.toLowerCase()))words.set(item.word.toLowerCase(),item.word);
      for(const item of segment.report.corrections)suggestions.add(JSON.stringify([segment.sessionId,item.entryId,item.quote,item.suggestion]));
    }
    return {segmentCount:complete.length,userTurnCount:turns.size,vocabulary:[...words.values()],correctionCount:suggestions.size,
      interpretation:'exposure_and_transcript_suggestions_not_mastery_or_proficiency'};
  }
}
