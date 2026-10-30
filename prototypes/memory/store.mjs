import {mkdirSync,readFileSync,readdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {explicitRemember,sessionOnlyMemory,additivePreference,confirmationDecision,memoryQuoteCore,memoryIdentity,memoryConflicts,favoriteDrinkQuestion} from './policy.mjs';
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
const TOPICS={'preference.hobby':'爱好 兴趣 喜欢做什么','preference.drink':'饮品 喝什么 喜欢喝 什么茶','preference.food':'食物 吃什么','preference.sport':'运动 体育 爱好','preference.game.genre':'游戏 类型','preference.music':'音乐 歌曲','project.name':'项目 名称 代号'};
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
    return {...memoryIdentity(candidate.key,candidate.quote,source.text),layer:candidate.layer,kind:candidate.kind,text:candidate.quote,sessionOnly:sessionOnlyMemory(candidate.quote,source.text),
      source:{sessionId:session.id,entryId:source.id,quote:candidate.quote,at:source.at}};
  }
  addTo(state,candidate,origin){
    const retired=state.memories.find(m=>memoryIdentity(m.key,m.text).key===candidate.key&&['rejected','superseded','excluded'].includes(m.status)&&m.sources.some(s=>s.sessionId===candidate.source.sessionId&&s.entryId===candidate.source.entryId));
    if(retired)return {status:retired.status==='excluded'?'excluded':'inactive',memoryId:retired.id};
    const matches=state.memories.filter(m=>clean(memoryQuoteCore(m.text))===clean(memoryQuoteCore(candidate.text)));
    const identical=matches.find(m=>['confirmed','pending_confirmation','excluded'].includes(m.status))||matches.find(m=>m.sources.some(s=>s.sessionId===candidate.source.sessionId&&s.entryId===candidate.source.entryId));
    if(identical){
      if(identical.status==='excluded')return {status:'excluded',memoryId:identical.id};
      if(['rejected','superseded'].includes(identical.status))return {status:'inactive',memoryId:identical.id};
      if(!identical.sources.some(s=>s.sessionId===candidate.source.sessionId&&s.entryId===candidate.source.entryId))identical.sources.push(candidate.source);
      return {status:identical.status==='confirmed'?'already_saved':'pending_confirmation',memoryId:identical.id};
    }
    const collision=state.memories.filter(m=>m.status==='confirmed'&&memoryConflicts(candidate,m));
    // First release is deliberately conservative: observations and conflicting
    // values remain candidates. No inferred personality or silent replacement.
    const conflict=collision.length>0;
    const pending=conflict||candidate.kind==='observation'||/^project[._-]|项目(?:名|代号)/u.test(candidate.key);
    const memory={id:idFor(`${candidate.key}\0${candidate.text}${matches.length?'\0'+candidate.source.entryId:''}`),key:candidate.key,layer:candidate.layer,kind:candidate.kind,text:candidate.text,additive:candidate.additive,preferenceKind:candidate.preferenceKind,correction:candidate.correction,
      status:pending?'pending_confirmation':'confirmed',reason:conflict?'possible_conflict':candidate.kind==='observation'?'observation_unverified':pending?'project_name_confirmation':null,
      conflicts:conflict?collision.map(m=>m.id):[],
      sources:[candidate.source],createdAt:now(),origin};
    state.memories.push(memory);return {status:memory.status==='confirmed'?'saved':'pending_confirmation',memoryId:memory.id};
  }
  offerConfirmation(id,sessionId,requestEntryId,{explicit=false}={}){
    const session=this.readSession(sessionId),request=session.entries.filter(e=>e.role==='user').at(-1),m=this.state.memories.find(m=>m.id===id);
    if(session.status!=='active'||request?.id!==requestEntryId||!m||m.status!=='pending_confirmation'||m.kind!=='fact')return {status:'rejected'};
    const old=this.state.memories.filter(x=>x.status==='confirmed'&&memoryConflicts(m,x));
    if(m.lastOffer&&(m.lastOffer.sessionId===sessionId||!explicit))return {status:'pending_confirmation',memoryId:id,reason:'already_asked',current:old.length===1&&old[0].text.length<=120?old[0].text:null};
    if(m.text.length>120||old.length>3||old.reduce((n,x)=>n+x.text.length,0)>100)return {status:'needs_detail',memoryId:id};
    const previous=old.length?`之前记的是${old.map(x=>`“${x.text}”`).join('、')}。`:'';
    const scope=old.length===1?'这项旧记录':`这 ${old.length} 条旧记录`;
    const question=old.length?`${previous}要改为“${m.text}”，替换${scope}吗？`:`我听到的是“${m.text}”，这样记准确吗？`;
    const offer={token:randomUUID(),sessionId,requestEntryId,expectedIds:old.map(m=>m.id).sort(),question,at:now(),responseId:null};
    this.commit(s=>{s.memories.find(m=>m.id===id).lastOffer=offer;});
    return {status:'confirmation_required',memoryId:id,offer};
  }
  bindConfirmation(id,token,responseId){
    this.commit(s=>{const m=s.memories.find(m=>m.id===id);if(!m?.lastOffer||m.lastOffer.token!==token)throw new Error('Stale confirmation');m.lastOffer.responseId=responseId;});
  }
  resolveConfirmation(id,token,sessionId,userEntryId,{deferUnclear=false}={}){
    const session=this.readSession(sessionId),users=session.entries.filter(e=>e.role==='user'),request=users.at(-1),m=this.state.memories.find(m=>m.id===id),offer=m?.lastOffer;
    const decision=confirmationDecision(request?.text)||(deferUnclear&&favoriteDrinkQuestion(request?.text)?'unclear':null);
    const spoken=session.entries.find(e=>e.role==='assistant'&&e.responseId===offer?.responseId);
    if(session.status!=='active'||m?.status!=='pending_confirmation'||!offer||offer.resolved||offer.token!==token||offer.sessionId!==sessionId||request?.id!==userEntryId||users.at(-2)?.id!==offer.requestEntryId||!decision||spoken?.source!=='local_memory'||spoken.text!==offer.question||(decision==='accept'&&spoken.playback!=='completed'))return {status:'rejected',reason:'no_current_heard_question'};
    const current=this.state.memories.filter(x=>x.status==='confirmed'&&memoryConflicts(m,x)).map(x=>x.id).sort();
    if(JSON.stringify(current)!==JSON.stringify(offer.expectedIds))return {status:'stale',reason:'memory_changed'};
    this.commit(s=>{
      const target=s.memories.find(m=>m.id===id);
      const audit={decision,at:now(),source:{sessionId,entryId:request.id,quote:request.text},questionResponseId:offer.responseId};
      (target.decisions??=[]).push(audit);target.lastOffer.resolved=decision;
      if(decision==='accept'){
        for(const old of s.memories)if(current.includes(old.id)){old.status='superseded';old.supersededBy=id;(old.decisions??=[]).push(audit);}
        target.status='confirmed';target.reason=null;
      }else if(decision==='reject'){target.status='rejected';target.reason='user_rejected';}
    });
    return {status:decision==='accept'?'saved':decision==='reject'?'kept_existing':decision==='unclear'?'unconfirmed':'deferred_confirmation',memoryId:id};
  }
  reconcileAdditivePreferences({dryRun=false}={}){
    const eligible=this.state.memories.filter(m=>m.status==='pending_confirmation'&&m.reason==='possible_conflict'&&m.kind==='fact'&&!m.lastOffer&&
      additivePreference(m.key,m.text,this.readSession(m.sources[0].sessionId).entries.find(e=>e.id===m.sources[0].entryId)?.text||'')&&
      this.state.memories.filter(x=>x.key===m.key&&x.status==='confirmed').every(x=>x.additive??additivePreference(x.key,x.text)));
    if(eligible.length&&!dryRun)this.commit(s=>{for(const id of eligible.map(m=>m.id)){const m=s.memories.find(m=>m.id===id);m.status='confirmed';m.reason=null;m.conflicts=[];m.additive=true;(m.decisions??=[]).push({decision:'compatible_addition',at:now(),policy:'positive_collection_v1'});}});
    return eligible.map(m=>m.id);
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
  favoriteDrinkReply(query){
    if(!favoriteDrinkQuestion(query))return null;
    const active=this.state.memories.filter(m=>m.status==='confirmed'&&memoryIdentity(m.key,m.text).key==='preference.drink');
    const favorites=active.filter(m=>(m.preferenceKind??memoryIdentity(m.key,m.text).preferenceKind)==='favorite');
    const ambiguous=active.some(m=>m.preferenceKind===undefined&&memoryIdentity(m.key,m.text).correction&&active.some(other=>other.id!==m.id&&memoryConflicts(m,other)));
    if(ambiguous||favorites.length>1)return '饮品记录里有需要核对的不同说法，我暂时不能确定你目前最喜欢哪一种。';
    if(favorites.length===1&&favorites[0].text.length<=120)return `你确认过：“${memoryQuoteCore(favorites[0].text).replace(/[。.!！]+$/u,'')}”。`;
    if(favorites.length)return '有一条已确认的饮品偏好，但内容较长，需要先核对具体范围。';
    return '目前还没有明确确认你最喜欢喝哪种饮品；普通的“喜欢”记录不能当成“最喜欢”。';
  }
  search(query){
    if(typeof query!=='string'||!query.trim()||query.length>300)throw new Error('Invalid retrieval query');
    const q=tokens(query);
    const scored=this.state.memories.filter(m=>['confirmed','pending_confirmation'].includes(m.status)).map(m=>{const t=tokens(`${m.text} ${m.key} ${TOPICS[m.key]||''}`);let overlap=0;for(const x of q)if(t.has(x))overlap++;return {m,score:overlap*(m.layer==='profile'?1.15:1)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const selected=scored.slice(0,6).map(({m})=>({id:m.id,key:memoryIdentity(m.key,m.text).key,preferenceKind:m.preferenceKind??memoryIdentity(m.key,m.text).preferenceKind,layer:m.layer,text:m.text,status:m.status,reason:m.reason,source:{sessionId:m.sources[0].sessionId,entryId:m.sources[0].entryId,at:m.sources[0].at}}));
    return {revision:this.state.revision,memories:selected.filter(m=>m.status==='confirmed'),pending:selected.filter(m=>m.status!=='confirmed'),retrieval:'lexical_v1',scope:'related_user_statements_only'};
  }
}

export class HistoryRecorder {
  constructor(store,entryMode){this.store=store;this.session=store.begin(entryMode);this.outputId=null;this.currentUser=null;this.ended=false;}
  persist(){this.store.saveSession(this.session);}
  user(text){if(this.ended)return;const entry={id:randomUUID(),role:'user',text,at:now(),source:'provider_asr',memoryExcluded:/(?:不要|别|不用|不必).{0,4}(?:记住|记下|保存)|(?:don't|do not|never)\s+(?:remember|save)/iu.test(text)};this.session.entries.push(entry);this.currentUser=entry.id;this.persist();return entry;}
  output(event,{source='provider_output'}={}){
    if(this.ended)return;
    const id=event.response_id||this.outputId;if(!id)return;
    let e=this.session.entries.find(e=>e.role==='assistant'&&e.responseId===id);
    if(!e){e={id:randomUUID(),role:'assistant',responseId:id,userEntryId:this.currentUser,text:'',at:now(),generation:'streaming',playback:'not_started',source};this.session.entries.push(e);}
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
      e.playback='interrupted';e.playbackInterruptedAt=now();if(e.generation==='streaming')e.generation='interrupted';changed=true;
    }
    if(changed)this.persist();
  }
  end(reason){
    if(this.ended)return;this.interrupt();this.session.status='ended';this.session.endedAt=now();this.session.endReason=reason;this.persist();this.store.queue(this.session);this.ended=true;
  }
}
