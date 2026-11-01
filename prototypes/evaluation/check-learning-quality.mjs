// Opt-in semantic regression: synthetic text only, isolated local archive.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {extractLearning} from '../learning/extract.mjs';
import {LearningArchive} from '../learning/archive.mjs';
if(process.argv[2]!=='--live'||process.argv.length!==3)throw new Error('Usage: node prototypes/evaluation/check-learning-quality.mjs --live');
const stamp=Date.now(),root=new URL(`../../runtime/evals/${stamp}-learning-quality-data/`,import.meta.url),path=new URL(`../../runtime/evals/${stamp}-learning-quality.json`,import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});const archive=new LearningArchive(fileURLToPath(root));
const cases=[
 {id:'assistant_wrong_tense',entries:[{id:'u1',role:'user',text:'I eat bread for breakfast.'},{id:'a1',role:'assistant',text:'Nice! Quick correction: since it’s about today’s breakfast, you can say "I ate bread for breakfast". What drink did you have with it?'}],expect:'none'},
 {id:'clear_subject_agreement',entries:[{id:'u2',role:'user',text:'She go to school every day.'},{id:'a2',role:'assistant',text:'You can say: She goes to school every day. How does she get there?'}],expect:'some'},
 {id:'spoken_name_no_punctuation',entries:[{id:'u3',role:'user',text:'whats your name'},{id:'a3',role:'assistant',text:'You can call me Jarvis. By the way, capitalize the first letter and add a question mark.'}],expect:'none'},
];
const report={at:new Date().toISOString(),syntheticTextOnly:true,cases:[],status:'running'};
try{
 for(const example of cases){
  const time=new Date().toISOString();archive.queue({id:example.id,sessionId:'synthetic-quality',startedAt:time,endedAt:time,reason:'evaluation',entries:example.entries});archive.begin(example.id);
  const {result,usage}=await extractLearning(example.entries);const done=archive.complete(example.id,result);
  report.cases.push({id:example.id,entries:example.entries,report:done.report,usage});
  if(example.expect==='none')assert.equal(done.report.corrections.length,0,example.id);else assert.ok(done.report.corrections.length>0,example.id);
 }
 report.status='bounded_cases_passed_requires_semantic_review';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`Report: ${path.pathname}`);}
