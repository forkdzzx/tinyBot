import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadConfig} from '../voice/config.mjs';
import {synthesize,converse} from './seeduplex.mjs';

const suite=process.argv[2]||'voice-v1';
if(!['voice-v1','voice-v2','voice-v3'].includes(suite)||process.argv.length>4)throw new Error('Usage: npm run voice:eval -- [voice-v1|voice-v2|voice-v3] [single-case-id]');
const baseline=JSON.parse(readFileSync(new URL(`../../eval/${suite}/baseline.json`,import.meta.url),'utf8'));
const caseText=readFileSync(new URL(`../../eval/${suite}/cases.json`,import.meta.url),'utf8'),allCases=JSON.parse(caseText);
const selectedCase=process.argv[3],cases=selectedCase?allCases.filter(c=>c.id===selectedCase):allCases;
if(!cases.length)throw new Error('Unknown case id');
if(createHash('sha256').update(baseline.request.session.instructions).digest('hex')!==baseline.promptSha256)throw new Error('Frozen baseline hash mismatch');
const repetitions=selectedCase?1:suite==='voice-v1'?3:2;
const report={date:new Date().toISOString(),baselineId:baseline.id,promptSha256:baseline.promptSha256,model:baseline.request.session.model,voice:baseline.request.session.audio.output.voice,repetitions,
  casesSha256:createHash('sha256').update(caseText).digest('hex'),cases,
  limits:`${cases.length} cases × ${repetitions} fresh sessions; 2 concurrent conversations; same generated PCM per question reused in memory; no audio saved`,synthesis:[],runs:[]};
const folder=new URL('../../runtime/evals/',import.meta.url);mkdirSync(folder,{recursive:true,mode:0o700});
const filename=new URL(`${Date.now()}-${baseline.id}.json`,folder);
const save=()=>writeFileSync(filename,JSON.stringify(report,null,2),{mode:0o600});
const {key}=loadConfig();
const audio=new Map();
// Use the original fixed speech generator for both versions, independent of candidate instructions.
const synthesisBaseline=JSON.parse(readFileSync(new URL('../../eval/voice-v1/baseline.json',import.meta.url),'utf8'));
report.synthesisPromptSha256=synthesisBaseline.promptSha256;
save();
try{
  for(const text of new Set(cases.flatMap(c=>c.turns))){
    report.preparingQuestion=text;save();
    const result=await synthesize(key,synthesisBaseline,text);audio.set(text,result);
    report.synthesis.push({text,seconds:result.pcm.length/48000,sha256:createHash('sha256').update(result.pcm).digest('hex'),usage:result.usage});
    console.log(`Prepared ${audio.size} synthetic prompts`);save();
  }
  delete report.preparingQuestion;
  const jobs=cases.flatMap(c=>Array.from({length:repetitions},(_,i)=>({c,repetition:i+1})));
  let nextJob=0;
  async function worker(){
    while(nextJob<jobs.length){
      const {c,repetition}=jobs[nextJob++];
      const run={caseId:c.id,repetition,criteria:c.criteria,status:'unreviewed'};
      try{run.result=await converse(key,baseline,c.turns,audio);}
      catch(error){run.status='infrastructure_error';run.error=error.message;if(error.partial)run.partial=error.partial;}
      report.runs.push(run);save();console.log(`Completed ${c.id} ${repetition}/${repetitions}: ${run.status}`);
    }
  }
  await Promise.all([worker(),worker()]);
  report.completedAt=new Date().toISOString();save();console.log(`Report: ${filename.pathname}`);
  if(report.runs.some(r=>r.status==='infrastructure_error'))process.exitCode=1;
}catch(error){report.error=error.message;if(error.diagnostics)report.errorDiagnostics=error.diagnostics;save();console.error(error.message);process.exitCode=1;}
