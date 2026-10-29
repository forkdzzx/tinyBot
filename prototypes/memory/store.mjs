import {mkdirSync,readFileSync,readdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {explicitRemember,sessionOnlyMemory} from './policy.mjs';
export {explicitRemember} from './policy.mjs';

const now=()=>new Date().toISOString();
export function atomicJSON(path,value){
  const temp=`${path}.${randomUUID()}.tmp`;let fd;
  try{fd=openSync(temp,'wx',0o600);writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);closeSync(fd);fd=null;renameSync(temp,path);
    fd=openSync(dirname(path),'r');fsyncSync(fd);closeSync(fd);fd=null;}
  finally{if(fd!=null)closeSync(fd);if(existsSync(temp))unlinkSync(temp);}
}
const clean=s=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const idFor=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
function tokens(text){
  const s=clean(text),parts=new Set(text.toLowerCase().match(/[a-z0-9]{2,}/g)||[]);
  for(const run of s.match(/[\p{Script=Han}]+/gu)||[])for(let i=0;i<run.length-1;i++)parts.add(run.slice(i,i+2));
  for(const word of ['什么','我的','我是','今天','现在','这个','那个','一下','记住','帮我','请问','知道','the','what','my','me','you','is','do'])parts.delete(word);
  return parts;
}

export class MemoryStore {
  constructor(root,{write=atomicJSON,recover=true}={}){
    this.root=root;this.write=write;this.historyDir=join(root,'history');mkdirSync(this.historyDir,{recursive:true,mode:0o700});
    this.statePath=join(root,'memory.json');
    this.state=existsSync(this.statePath)?JSON.parse(readFileSync(this.statePath,'utf8')):{schemaVersion:1,revision:0,memories:[],jobs:{},summaries:{}};
    if(this.state.schemaVersion!==1||!Array.isArray(this.state.memories)||!this.state.jobs||!this.state.summaries)throw new Error('Invalid memory store; preserve files for repair');
    if(recover)this.recover();
  }
  commit(change){const next=structuredClone(this.state);change(next);next.revision++;this.write(this.statePath,next);this.state=next;}
  sessionPath(id){if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new Error('Invalid session id');return join(this.historyDir,`${id}.json`);}
  readSession(id){return JSON.parse(readFileSync(this.sessionPath(id),'utf8'));}
  saveSession(session){this.write(this.sessionPath(session.id),session);}
  begin(entryMode){const session={schemaVersion:1,id:randomUUID(),startedAt:now(),endedAt:null,status:'active',entryMode,entries:[]};this.saveSession(session);return session;}
  recover(){
    const running=Object.values(this.state.jobs).some(j=>j.status==='running');
    if(running)this.commit(s=>{for(const j of Object.values(s.jobs))if(j.status==='running'){j.status=j.attempts>=3?'failed':'pending';j.lastError='process_interrupted';}});
    for(const file of readdirSync(this.historyDir).filter(f=>f.endsWith('.json'))){
      const session=JSON.parse(readFileSync(join(this.historyDir,file),'utf8'));
      if(session.schemaVersion!==1||!Array.isArray(session.entries))throw new Error('Invalid history; preserve files for repair');
      if(session.status==='active'){
        session.status='interrupted';session.endedAt=now();session.endReason='process_restart';
        for(const e of session.entries)if(e.role==='assistant'&&e.playback!=='completed'){e.playback='unknown';if(e.generation==='streaming')e.generation='interrupted';}
        this.saveSession(session);
      }
      this.queue(session);
    }
  }
  queue(session){
    if(session.status==='active'||session.entryMode==='diagnostic')return;
    const chunks=[];let chunk=[],size=0;
    for(const e of session.entries.filter(e=>e.role==='user'&&!e.memoryExcluded&&e.text.trim())){
      for(let from=0;from<e.text.length;from+=6000){
        const to=Math.min(from+6000,e.text.length),length=to-from;
        if(size+length>10000&&chunk.length){chunks.push(chunk);chunk=[];size=0;}
        chunk.push({entryId:e.id,from,to});size+=length;
      }
    }
    if(chunk.length)chunks.push(chunk);
    const missing=chunks.map((entries,i)=>({id:`${session.id}:${i}`,sessionId:session.id,entries})).filter(j=>!this.state.jobs[j.id]);
    if(missing.length)this.commit(s=>{for(const j of missing)s.jobs[j.id]={...j,status:'pending',attempts:0,notBefore:0,lastError:null};});
  }
  nextJob(time=Date.now()){return Object.values(this.state.jobs).find(j=>j.status==='pending'&&j.notBefore<=time);}
  startJob(id){this.commit(s=>{const j=s.jobs[id];if(!j||j.status!=='pending'||j.attempts>=3)throw new Error('Job not runnable');j.status='running';j.attempts++;});}
  failJob(id,code){this.commit(s=>{const j=s.jobs[id];j.status=j.attempts>=3?'failed':'pending';j.lastError=code;j.notBefore=Date.now()+(j.attempts===1?60000:300000);});}
  jobInput(job){const session=this.readSession(job.sessionId);return job.entries.map(ref=>{const e=session.entries.find(e=>e.id===ref.entryId);if(!e||e.role!=='user')throw new Error('Invalid job source');return {entry_id:e.id,text:e.text.slice(ref.from,ref.to)};});}
  validateCandidate(candidate,session,allowedIds){
    if(!candidate||!['cross_session','profile'].includes(candidate.layer)||!['fact','observation'].includes(candidate.kind)||typeof candidate.key!=='string'||!/^[\p{L}\p{N}_.-]{2,80}$/u.test(candidate.key)||typeof candidate.quote!=='string'||candidate.quote.trim().length<4||candidate.quote.length>600)throw new Error('Invalid memory candidate');
    const source=session.entries.find(e=>e.id===candidate.source_entry_id&&e.role==='user'&&allowedIds.has(e.id));
    if(!source||source.memoryExcluded||!source.text.includes(candidate.quote))throw new Error('Memory source is not user evidence');
    return {key:candidate.key.toLowerCase(),layer:candidate.layer,kind:candidate.kind,text:candidate.quote,sessionOnly:sessionOnlyMemory(candidate.quote,source.text),
      source:{sessionId:session.id,entryId:source.id,quote:candidate.quote,at:source.at}};
  }
  addTo(state,candidate,origin){
    const identical=state.memories.find(m=>clean(m.text)===clean(candidate.text));
    if(identical){
      if(identical.status==='excluded')return {status:'excluded',memoryId:identical.id};
      if(!identical.sources.some(s=>s.sessionId===candidate.source.sessionId&&s.entryId===candidate.source.entryId))identical.sources.push(candidate.source);
      return {status:identical.status==='confirmed'?'already_saved':'pending_confirmation',memoryId:identical.id};
    }
    const collision=state.memories.filter(m=>m.key===candidate.key&&m.status!=='excluded');
    // First release is deliberately conservative: observations and conflicting
    // values remain candidates. No inferred personality or silent replacement.
    const pending=collision.length>0||candidate.kind==='observation'||/^project[._-]|项目(?:名|代号)/u.test(candidate.key);
    const memory={id:idFor(`${candidate.key}\0${candidate.text}`),key:candidate.key,layer:candidate.layer,kind:candidate.kind,text:candidate.text,
      status:pending?'pending_confirmation':'confirmed',reason:collision.length?'possible_conflict':candidate.kind==='observation'?'observation_unverified':pending?'project_name_confirmation':null,
      sources:[candidate.source],createdAt:now(),origin};
    state.memories.push(memory);return {status:memory.status==='confirmed'?'saved':'pending_confirmation',memoryId:memory.id};
  }
  remember(sessionId,candidate,requestEntryId){
    const session=this.readSession(sessionId),request=session.entries.find(e=>e.id===requestEntryId&&e.role==='user');
    const users=session.entries.filter(e=>e.role==='user');
    if(session.status!=='active'||request!==users.at(-1)||!explicitRemember(request?.text))throw new Error('No explicit current memory request');
    const data=this.validateCandidate({...candidate,kind:'fact'},session,new Set(users.map(e=>e.id)));
    if(data.sessionOnly)return {status:'session_only',reason:'这是本次聊天的语言或表达要求，只在本次遵循，未写入长期偏好。'};
    let result;this.commit(s=>{result=this.addTo(s,data,'explicit');});return result;
  }
  completeJob(id,result){
    const job=this.state.jobs[id];if(!job||job.status!=='running')throw new Error('Job not running');
    if(!result||typeof result.summary!=='string'||result.summary.length>1500||!Array.isArray(result.memories)||result.memories.length>12)throw new Error('Invalid extraction result');
    const session=this.readSession(job.sessionId),ids=new Set(job.entries.map(e=>e.entryId));
    const candidates=result.memories.map(c=>this.validateCandidate(c,session,ids));
    this.commit(s=>{
      for(const c of candidates)if(!c.sessionOnly)this.addTo(s,c,'extracted');
      s.jobs[id].skippedCandidates=candidates.filter(c=>c.sessionOnly).map(c=>({key:c.key,sourceEntryId:c.source.entryId,reason:'session_only_instruction'}));
      s.summaries[id]={text:result.summary,status:'generated_summary',sourceSession:job.sessionId,sourceEntries:[...ids],createdAt:now()};
      s.jobs[id].status='done';s.jobs[id].completedAt=now();s.jobs[id].lastError=null;
    });
  }
  exclude(id,expectedText,reason){
    const memory=this.state.memories.find(m=>m.id===id);
    if(!memory||memory.text!==expectedText)throw new Error('Memory changed; review before excluding');
    if(memory.status==='excluded')return false;
    this.commit(s=>{const m=s.memories.find(m=>m.id===id);m.previousStatus=m.status;m.status='excluded';m.reason=reason;m.excludedAt=now();});return true;
  }
  search(query){
    if(typeof query!=='string'||!query.trim()||query.length>300)throw new Error('Invalid retrieval query');
    const q=tokens(query);
    const scored=this.state.memories.filter(m=>m.status!=='excluded').map(m=>{const t=tokens(`${m.text} ${m.key}`);let overlap=0;for(const x of q)if(t.has(x))overlap++;return {m,score:overlap*(m.layer==='profile'?1.15:1)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const selected=scored.slice(0,6).map(({m})=>({id:m.id,key:m.key,layer:m.layer,text:m.text,status:m.status,reason:m.reason,source:{sessionId:m.sources[0].sessionId,entryId:m.sources[0].entryId,at:m.sources[0].at}}));
    return {revision:this.state.revision,memories:selected.filter(m=>m.status==='confirmed'),pending:selected.filter(m=>m.status!=='confirmed'),retrieval:'lexical_v1',scope:'related_user_statements_only'};
  }
}

export class HistoryRecorder {
  constructor(store,entryMode){this.store=store;this.session=store.begin(entryMode);this.outputId=null;this.currentUser=null;this.ended=false;}
  persist(){this.store.saveSession(this.session);}
  user(text){if(this.ended)return;const entry={id:randomUUID(),role:'user',text,at:now(),source:'provider_asr',memoryExcluded:/(?:不要|别|不用|不必).{0,4}(?:记住|记下|保存)|(?:don't|do not|never)\s+(?:remember|save)/iu.test(text)};this.session.entries.push(entry);this.currentUser=entry.id;this.persist();return entry;}
  output(event){
    if(this.ended)return;
    const id=event.response_id||this.outputId;if(!id)return;
    let e=this.session.entries.find(e=>e.role==='assistant'&&e.responseId===id);
    if(!e){e={id:randomUUID(),role:'assistant',responseId:id,userEntryId:this.currentUser,text:'',at:now(),generation:'streaming',playback:'not_started',source:'provider_output'};this.session.entries.push(e);}
    this.outputId=id;
    if(event.type==='response.output_text.delta')e.text+=event.delta||event.text||'';
    if(event.type==='response.output_text.done'){e.text=event.text||e.text;e.generation='complete';this.persist();}
  }
  playback(id,state){
    if(this.ended||!['started','completed','interrupted'].includes(state))return;
    const e=this.session.entries.find(e=>e.responseId===id);if(!e||['interrupted','completed'].includes(e.playback))return;
    e.playback=state;e.playbackReportedAt=now();this.persist();
  }
  interrupt(){
    if(this.ended)return;let changed=false;
    for(const e of this.session.entries)if(e.role==='assistant'&&!['completed','interrupted'].includes(e.playback)){
      e.playback='interrupted';if(e.generation==='streaming')e.generation='interrupted';changed=true;
    }
    if(changed)this.persist();
  }
  end(reason){
    if(this.ended)return;this.interrupt();this.session.status='ended';this.session.endedAt=now();this.session.endReason=reason;this.persist();this.store.queue(this.session);this.ended=true;
  }
}
