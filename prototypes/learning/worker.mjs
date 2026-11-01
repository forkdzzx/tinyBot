import {extractLearning} from './extract.mjs';
export class LearningWorker{
  constructor(archive,{extract=extractLearning,onStatus=()=>{}}={}){this.archive=archive;this.extract=extract;this.onStatus=onStatus;this.tasks=new Map();this.tail=Promise.resolve();this.stopped=false;}
  emit(event){try{this.onStatus(event);}catch{}}
  start(){this.timer=setInterval(()=>this.kick(),30000);this.timer.unref();this.kick();}
  stop(){this.stopped=true;clearInterval(this.timer);this.controller?.abort();}
  run(id){
    if(this.tasks.has(id))return this.tasks.get(id);
    const task=this.tail.then(async()=>{
      if(this.stopped)return this.archive.get(id);
      const job=this.archive.begin(id);if(!job)return this.archive.get(id);
      this.controller=new AbortController();
      try{
        const {result,usage}=await this.extract(job.entries,{signal:this.controller.signal});if(this.stopped)return this.archive.get(id);
        const done=this.archive.complete(id,result);this.emit({type:'learning.done',segmentId:id,usage});return done;
      }catch(e){
        if(this.stopped)return this.archive.get(id);
        const code=/^learning_[a-z0-9_]+$/.test(e.message)?e.message:'learning_validation_or_storage_failed';
        const failed=this.archive.fail(id,code);this.emit({type:'learning.failed',segmentId:id,code});return failed;
      }
    });
    this.tasks.set(id,task);this.tail=task.catch(()=>{});
    task.finally(()=>this.tasks.delete(id)).catch(()=>{});return task;
  }
  kick(){if(this.stopped||this.tasks.size)return;const job=this.archive.pending()[0];if(job)this.run(job.id).then(result=>{if(result?.status==='done')this.kick();}).catch(()=>{});}
}
export async function waitForLearning(promise,ms=8000){
  let timer;try{return await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);})]);}finally{clearTimeout(timer);}
}
export function learningSpeech(jobs){
  if(!jobs.length)return '这段还没有足够的练习内容，先不做学习总结。已回到日常模式。';
  if(jobs.some(j=>j?.status==='failed'))return '这段练习结束了，学习记录暂时没整理成功，原始文字已保留。已回到日常模式。';
  if(jobs.some(j=>j?.status!=='done'))return '这段练习结束了，学习记录还在整理，稍后可以查看。已回到日常模式。';
  const words=jobs.flatMap(j=>j.report.vocabulary).filter(w=>w.word.length<=40&&w.meaning.length<=60).slice(0,2),fix=jobs.flatMap(j=>j.report.corrections).find(c=>c.quote.length<=80&&c.suggestion.length<=80);
  const parts=['这段练习结束了。'];
  if(words.length)parts.push('可以复习'+words.map(w=>`${w.word}，${w.meaning}`).join('；')+'。');
  if(fix)parts.push(`按这次转写，一个表达建议是把“${fix.quote}”换成“${fix.suggestion}”。`);
  if(!words.length&&!fix)parts.push(jobs.some(j=>j.report.vocabulary.length||j.report.corrections.length)?'较长的复习建议放在学习记录里了。':'这次没有整理出需要特别复习的词或表达。');
  parts.push('学习记录已保存，回到日常模式。');return parts.join('');
}
export function learningContext(archive){
  const progress=archive.progress(),last=archive.state.segments.filter(s=>s.status==='done').at(-1);
  return {segmentCount:progress.segmentCount,userTurnCount:progress.userTurnCount,lastVocabulary:(last?.report.vocabulary??[]).map(({word,meaning})=>({word,meaning})),lastCorrections:(last?.report.corrections??[]).slice(0,1).map(({quote,suggestion})=>({quote,suggestion})),meaning:'仅记录练习和接触词，不代表已经掌握或能力评级'};
}
