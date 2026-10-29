// Cloud synthesis can run faster than playback. Bound memory, not audio lead time.
export class PCMPlayer {
  constructor(context,{maxBytes=32*1024*1024}={}) {
    this.context=context;this.maxBytes=maxBytes;
    this.sources=new Map();this.nextPlay=0;this.bufferBytes=0;
  }
  get active(){return this.sources.size>0;}
  get queuedSeconds(){return Math.max(0,this.nextPlay-this.context.currentTime);}
  clear(){
    const previous=[...this.sources.keys()];
    this.sources.clear();this.nextPlay=0;this.bufferBytes=0;
    for(const source of previous){source.onended=null;try{source.stop();}catch{}source.disconnect();}
  }
  enqueue(delta,{onEnded=()=>{}}={}){
    let raw;
    try{raw=atob(delta);}catch{throw Object.assign(new Error('音频编码无效'),{code:'INVALID_AUDIO_BASE64'});}
    if(raw.length%2)throw Object.assign(new Error('音频字节长度异常'),{code:'MALFORMED_PCM'});
    if(!raw.length)return;
    // PCM16 becomes Float32 in AudioBuffer; count retained buffers until ended.
    const retainedBytes=raw.length*2;
    if(this.bufferBytes+retainedBytes>this.maxBytes)
      throw Object.assign(new Error('播放缓存达到 32 MiB 内存上限'),{code:'PLAYBACK_MEMORY_LIMIT'});
    const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    const view=new DataView(bytes.buffer);
    const audio=this.context.createBuffer(1,bytes.length/2,24000);
    const samples=audio.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
    const source=this.context.createBufferSource();source.buffer=audio;source.connect(this.context.destination);
    const start=Math.max(this.context.currentTime+.025,this.nextPlay);
    source.onended=()=>{
      if(this.sources.delete(source))this.bufferBytes-=retainedBytes;
      source.disconnect();
      onEnded();
    };
    try{source.start(start);}catch(error){source.disconnect();throw error;}
    this.sources.set(source,retainedBytes);this.bufferBytes+=retainedBytes;
    this.nextPlay=start+audio.duration;
  }
}

// Browser receipts describe audio scheduling/completion, not proof the owner
// heard it. A cloud audio.done event alone must never mark playback complete.
export class PlaybackReceipts {
  constructor(send){this.send=send;this.streamId=null;this.records=new Map();}
  stream(id){if(!id)return;this.streamId=id;if(!this.records.has(id))this.records.set(id,{pending:0,done:false,reported:false,closed:false});}
  queued(){
    const id=this.streamId,r=this.records.get(id);if(!r||r.closed)return ()=>{};
    r.pending++;if(!r.reported){r.reported=true;this.send(id,'started');}
    return ()=>{if(r.closed)return;r.pending--;this.check(id,r);};
  }
  finish(id=this.streamId){const r=this.records.get(id);if(r){r.done=true;this.check(id,r);}}
  check(id,r){if(r.done&&r.pending===0&&r.reported&&!r.closed){r.closed=true;this.send(id,'completed');}}
  interrupt(){for(const [id,r] of this.records)if(!r.closed){r.closed=true;this.send(id,'interrupted');}this.records.clear();this.streamId=null;}
}
