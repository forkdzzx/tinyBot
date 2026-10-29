// Evaluation parser, not a production TTS segmenter. Sentence timing uses punctuation.
export async function readArkStream(body,elapsed){
  if(!body)throw new Error('Empty Ark stream');
  const reader=body.getReader(),decoder=new TextDecoder();
  let buffer='',answer='',done=false,finishReason=null,model,usage,bytes=0;
  let firstTextMs=null,firstSentenceMs=null,firstSentence=null;
  function event(block){
    const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
    if(!data)return;
    if(data==='[DONE]'){done=true;return;}
    let item;try{item=JSON.parse(data);}catch{throw new Error('Invalid Ark SSE JSON');}
    if(item.error)throw new Error('Ark SSE provider error');
    if(item.model)model=item.model;if(item.usage)usage=item.usage;
    const choice=item.choices?.[0];
    if(choice?.finish_reason)finishReason=choice.finish_reason;
    const delta=choice?.delta?.content;
    if(typeof delta==='string'&&delta){
      answer+=delta;
      if(answer.trim())firstTextMs??=elapsed();
      const match=answer.match(/^[\s\S]*?(?:[。！？]|[.!?](?=\s|$))/u);
      if(firstSentenceMs===null&&match?.[0].trim()){
        firstSentence=match[0].trim();firstSentenceMs=elapsed();
      }
    }
  }
  try{
    while(!done){
      const {value,done:eof}=await reader.read();
      if(eof)break;
      bytes+=value.byteLength;if(bytes>1024*1024)throw new Error('Ark stream byte budget');
      buffer+=decoder.decode(value,{stream:true});
      let boundary;
      while(!done&&(boundary=/\r?\n\r?\n/.exec(buffer))){
        event(buffer.slice(0,boundary.index));buffer=buffer.slice(boundary.index+boundary[0].length);
      }
    }
    if(!done||finishReason!=='stop'||!answer.trim())throw new Error('Ark stream incomplete or empty');
    // Missing punctuation is kept null: EOF is not a measured sentence boundary.
    return {answer,model,usage,firstTextMs,firstSentenceMs,firstSentence};
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
