import {randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {modeCommand} from '../modes/controller.mjs';
import {sessionCommand} from '../voice/lifecycle.mjs';
import {practiceEnd} from './intents.mjs';

function segments(session,active,end,reason){
  const selected=session.entries.slice(active.startIndex,end);
  const userIds=new Set(selected.filter(e=>e.role==='user'&&!e.memoryExcluded&&!modeCommand(e.text)&&!sessionCommand(e.text)&&!practiceEnd(e.text)).map(e=>e.id));
  const entries=selected.filter(e=>userIds.has(e.id)||(e.role==='assistant'&&userIds.has(e.userEntryId)&&e.source==='provider_output'&&e.generation==='complete'&&e.playback==='completed'));
  const chunks=[];let chunk=[],size=0;
  for(const entry of entries)for(let offset=0;offset<entry.text.length;offset+=2000){
    const text=entry.text.slice(offset,offset+2000);if(!text.trim())continue;
    if(chunk.length>=60||size+text.length>16000){chunks.push(chunk);chunk=[];size=0;}
    chunk.push({id:offset?`${entry.id}:${offset}`:entry.id,role:entry.role,text});size+=text.length;
  }
  if(chunk.length)chunks.push(chunk);
  return chunks.map((entries,i)=>({id:`${active.id}-${i}`,sessionId:session.id,startedAt:active.startedAt,endedAt:new Date().toISOString(),reason,entries}));
}
export class PracticeTracker{
  constructor(history,archive){this.history=history;this.archive=archive;history.session.practice??={active:null,closed:[]};}
  enter(startIndex=this.history.session.entries.length){
    if(this.history.session.practice.active)return;
    this.history.session.practice.active={id:randomUUID(),startIndex,startedAt:new Date().toISOString()};this.history.persist();
  }
  close(reason,beforeEntryId){
    const session=this.history.session,active=session.practice.active;if(!active)return [];
    const index=beforeEntryId?session.entries.findIndex(e=>e.id===beforeEntryId):session.entries.length;
    const jobs=segments(session,active,index<0?session.entries.length:index,reason);
    session.practice.active=null;session.practice.closed.push(...jobs);this.history.persist();
    return jobs.map(job=>this.archive.queue(job)).filter(Boolean);
  }
}
// A crash can leave a persisted practice range without a queued archive job.
// MemoryStore has already marked that history interrupted before this runs.
export function recoverPractice(store,archive){
  for(const file of readdirSync(store.historyDir).filter(f=>f.endsWith('.json'))){
    const session=store.readSession(file.slice(0,-5));if(!session.practice||session.status==='active')continue;
    if(session.practice.active){session.practice.closed.push(...segments(session,session.practice.active,session.entries.length,'process_restart'));session.practice.active=null;store.saveSession(session);}
    for(const segment of session.practice.closed)archive.queue(segment);
  }
}
