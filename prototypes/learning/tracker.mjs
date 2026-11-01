import {randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {modeCommand} from '../modes/controller.mjs';
import {sessionCommand} from '../voice/lifecycle.mjs';
import {practiceEnd} from './intents.mjs';

function segments(session,active,end,reason){
  const selected=session.entries.slice(active.startIndex,end);
  const userIds=new Set(selected.filter(e=>e.role==='user'&&!e.memoryExcluded&&!modeCommand(e.text)&&!sessionCommand(e.text)&&!practiceEnd(e.text)).map(e=>e.id));
  const entries=selected.filter(e=>userIds.has(e.id)||(e.role==='assistant'&&userIds.has(e.userEntryId)&&e.source==='provider_output'&&e.generation==='complete'&&e.playback==='completed'));
  const chunks=[],anchors=new Map();let chunk=[],size=0,chunkIds=new Set(),chunkUsers=new Set();
  const flush=()=>{if(chunk.length)chunks.push(chunk);chunk=[];size=0;chunkIds=new Set();chunkUsers=new Set();};
  const append=(piece,userId)=>{
    if(chunkIds.has(piece.id))return;
    chunk.push(piece);size+=piece.text.length;chunkIds.add(piece.id);if(userId)chunkUsers.add(userId);
  };
  for(const entry of entries)for(let offset=0;offset<entry.text.length;offset+=2000){
    const text=entry.text.slice(offset,offset+2000);if(!text.trim())continue;
    const piece={id:offset?`${entry.id}:${offset}`:entry.id,role:entry.role,text};
    if(entry.role==='user'&&!anchors.has(entry.id))anchors.set(entry.id,piece);
    const anchor=entry.role==='assistant'?anchors.get(entry.userEntryId):null;
    // Assistant-only overflow still belongs to a real learner turn. Repeat its
    // exact source anchor so the archive can retain it without inventing speech;
    // progress deduplicates the unchanged original user id across these chunks.
    if(entry.role==='assistant'&&!anchor)continue;
    let needsAnchor=anchor&&!chunkUsers.has(entry.userEntryId);
    if(chunk.length+1+(needsAnchor?1:0)>60||size+text.length+(needsAnchor?anchor.text.length:0)>16000){flush();needsAnchor=Boolean(anchor);}
    if(needsAnchor)append(anchor,entry.userEntryId);
    append(piece,entry.role==='user'?entry.id:null);
  }
  flush();
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
