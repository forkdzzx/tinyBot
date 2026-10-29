import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadArkConfig,TextConversation} from './ark.mjs';
import {loadConfig} from '../voice/config.mjs';
import {synthesize,converse} from './seeduplex.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const baseline=JSON.parse(readFileSync(new URL('../../eval/voice-v1/baseline.json',import.meta.url),'utf8'));
const caseText=readFileSync(new URL('../../eval/voice-v1/next-cases.json',import.meta.url),'utf8'),cases=JSON.parse(caseText);
const report={startedAt:new Date().toISOString(),promptSha256:baseline.promptSha256,casesSha256:hash(caseText),cases,
  limits:'12 paired fresh sessions, 28 turns per route; 12 additional Ark latency calls; max 2 paired workers; synthetic audio in RAM only; no retries',latency:[],synthesis:[],pairs:[]};
const folder=new URL('../../runtime/evals/',import.meta.url);mkdirSync(folder,{recursive:true,mode:0o700});
const file=new URL(`${Date.now()}-next-voice-v1.json`,folder);
const save=()=>writeFileSync(file,JSON.stringify(report,null,2),{mode:0o600});
try{
  if(hash(baseline.request.session.instructions)!==baseline.promptSha256)throw new Error('Frozen baseline mismatch');
  const ark=loadArkConfig(),speech=loadConfig();report.arkModel=ark.model;report.speechModel=baseline.request.session.model;save();
  const conversation=()=>new TextConversation({...ark,instructions:baseline.request.session.instructions});
  // Interleave modes and reverse order on the second repetition to reduce order bias.
  const probes=["What's your name?","我们聊聊今晚的安排，我先写代码，再看球。","用两句话解释 Java 中重载和重写的区别。"];
  for(let repetition=1;repetition<=2;repetition++)for(const question of probes){
    for(const stream of repetition===1?[false,true]:[true,false]){
      const run={question,repetition,stream,status:'unreviewed'};report.latency.push(run);save();
      try{run.result=await conversation().turn(question,{stream});}
      catch(error){run.status='infrastructure_error';run.error=error.message;save();throw error;}
      save();console.log(`Latency ${repetition}/2 ${stream?'stream':'full'} completed`);
    }
  }
  const audio=new Map();
  for(const question of new Set(cases.flatMap(c=>c.turns))){
    const result=await synthesize(speech.key,baseline,question);audio.set(question,result);
    report.synthesis.push({question,seconds:result.pcm.length/48000,sha256:hash(result.pcm),usage:result.usage});save();console.log(`Prepared ${audio.size} new prompts`);
  }
  const jobs=cases.flatMap(c=>[1,2].map(repetition=>({c,repetition})));let next=0,stopped=false;
  async function worker(){
    while(!stopped&&next<jobs.length){
      const {c,repetition}=jobs[next++],pair={caseId:c.id,repetition,status:'unreviewed',ark:{turns:[]}};
      report.pairs.push(pair);save();
      try{
        pair.speech=await converse(speech.key,baseline,c.turns,audio);save();
        const text=conversation();
        for(const turn of pair.speech.turns){
          if(!turn.recognized.trim())throw new Error('Missing ASR transcript');
          pair.ark.turns.push({question:turn.question,recognized:turn.recognized,...await text.turn(turn.recognized,{stream:true})});save();
        }
        pair.ark.history=text.history.slice(1);
      }catch(error){pair.status='infrastructure_error';pair.error=error.message;stopped=true;}
      save();console.log(`Pair ${c.id} ${repetition}/2: ${pair.status}`);
    }
  }
  await Promise.all([worker(),worker()]);
  if(stopped)throw new Error('Stopped after paired infrastructure failure; existing in-flight pair allowed to finish');
  report.completedAt=new Date().toISOString();save();console.log(`Report: ${file.pathname}`);
}catch(error){report.error=error.message;save();console.error(error.message);process.exitCode=1;}
