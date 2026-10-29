import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {readArkStream} from './ark-stream.mjs';

const ENDPOINT='https://ark.cn-beijing.volces.com/api/v3/chat/completions';
export function loadArkConfig(){
  let env;
  try{env=parseEnv(readFileSync(new URL('../../runtime/ark.env',import.meta.url),'utf8'));}
  catch{throw new Error('请按 docs/ark-evaluation-setup.md 配置 runtime/ark.env');}
  const key=env.ARK_API_KEY?.trim(),model=env.ARK_MODEL?.trim();
  if(!key||!model||/填写|placeholder|your.key/i.test(key))throw new Error('runtime/ark.env 缺少有效的 ARK_API_KEY 或 ARK_MODEL');
  return {key,model};
}

// Evaluation only: each instance owns one short conversation, not persistent memory.
export class TextConversation{
  #messages;#key;#model;#fetch;#busy=false;
  constructor({key,model,instructions,fetchImpl=fetch}){
    this.#key=key;this.#model=model;this.#fetch=fetchImpl;
    this.#messages=[{role:'system',content:instructions}];
  }
  get history(){return this.#messages.map(m=>({...m}));}
  async turn(text,{stream=false}={}){
    if(this.#busy)throw new Error('Concurrent turns are not supported in this evaluation');
    if(typeof text!=='string'||!text.trim())throw new Error('Empty input');
    this.#busy=true;const start=performance.now();
    const messages=[...this.history,{role:'user',content:text}];
    try{
      let response;
      try{
        response=await this.#fetch(ENDPOINT,{
          method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),
          headers:{Authorization:`Bearer ${this.#key}`,'Content-Type':'application/json'},
          body:JSON.stringify({model:this.#model,messages,stream,...(stream?{stream_options:{include_usage:true}}:{}),thinking:{type:'disabled'},max_completion_tokens:512}),
        });
      }catch{throw new Error('Ark network failure or 30s timeout');}
      if(!response.ok){await response.body?.cancel();throw new Error(`Ark HTTP ${response.status}`);}
      let result,answer,timing={};
      if(stream){
        try{result=await readArkStream(response.body,()=>Math.round(performance.now()-start));}
        catch{throw new Error('Ark stream failed, incomplete or timed out');}
        answer=result.answer;
        timing={firstTextMs:result.firstTextMs,firstSentenceMs:result.firstSentenceMs,firstSentence:result.firstSentence};
      }else{
        try{result=await response.json();}catch{throw new Error('Invalid Ark JSON');}
        const choice=result.choices?.[0];answer=choice?.message?.content;
        if(choice?.finish_reason!=='stop'||typeof answer!=='string'||!answer.trim())throw new Error('Ark response incomplete or empty');
      }
      this.#messages=[...messages,{role:'assistant',content:answer}];
      const usage={};
      for(const field of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isFinite(result.usage?.[field]))usage[field]=result.usage[field];
      if(Number.isFinite(result.usage?.prompt_tokens_details?.cached_tokens))usage.cached_tokens=result.usage.prompt_tokens_details.cached_tokens;
      return {answer,...timing,fullResponseMs:Math.round(performance.now()-start),usage,model:result.model??this.#model};
    }finally{this.#busy=false;}
  }
}
