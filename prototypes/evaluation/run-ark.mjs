import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadArkConfig,TextConversation} from './ark.mjs';

try{
  const config=loadArkConfig();
  if(process.argv.length!==4||process.argv[2]!=='--source')throw new Error('Usage: npm run voice:eval:ark -- --source runtime/evals/<voice-report>.json');
  const baseline=JSON.parse(readFileSync(new URL('../../eval/voice-v1/baseline.json',import.meta.url),'utf8'));
  const cases=JSON.parse(readFileSync(new URL('../../eval/voice-v1/cases.json',import.meta.url),'utf8'));
  const sourceText=readFileSync(process.argv[3],'utf8'),source=JSON.parse(sourceText);
  if(source.promptSha256!==baseline.promptSha256||createHash('sha256').update(baseline.request.session.instructions).digest('hex')!==baseline.promptSha256)throw new Error('Baseline mismatch');
  if(!source.completedAt||source.runs?.length!==cases.length*3)throw new Error('Expected complete 18-session source report');
  const identities=new Set();
  for(const run of source.runs){
    const c=cases.find(c=>c.id===run.caseId),id=`${run.caseId}/${run.repetition}`;
    if(!c||![1,2,3].includes(run.repetition)||identities.has(id)||run.result?.turns?.length!==c.turns.length)throw new Error('Source case mismatch');
    identities.add(id);
    for(const [i,t] of run.result.turns.entries())if(t.question!==c.turns[i]||typeof t.recognized!=='string'||!t.recognized.trim())throw new Error('Source transcript missing or mismatched');
  }
  const report={date:new Date().toISOString(),baselineId:baseline.id,promptSha256:baseline.promptSha256,sourceSha256:createHash('sha256').update(sourceText).digest('hex'),model:config.model,
    limits:'ASR transcript replay; local explicit history with own replies; non-streaming text only, NOT full voice pipeline or voice latency',runs:[]};
  const folder=new URL('../../runtime/evals/',import.meta.url);mkdirSync(folder,{recursive:true,mode:0o700});
  const file=new URL(`${Date.now()}-ark-${baseline.id}.json`,folder);
  const save=()=>writeFileSync(file,JSON.stringify(report,null,2),{mode:0o600});save();
  for(const sourceRun of source.runs){
    const conversation=new TextConversation({...config,instructions:baseline.request.session.instructions});
    const run={caseId:sourceRun.caseId,repetition:sourceRun.repetition,status:'unreviewed',turns:[]};report.runs.push(run);
    try{
      for(const t of sourceRun.result.turns){run.turns.push({question:t.question,recognized:t.recognized,...await conversation.turn(t.recognized)});save();}
      run.history=conversation.history.slice(1);
    }catch(error){run.status='infrastructure_error';run.error=error.message;save();throw new Error(`Stopped on ${run.caseId}: ${error.message}`);}
    save();console.log(`Completed ${run.caseId} ${run.repetition}/3: unreviewed`);
  }
  report.completedAt=new Date().toISOString();save();console.log(`Report: ${file.pathname}`);
}catch(error){console.error(error.message);process.exitCode=1;}
