// Energy is only a diagnostic proxy for speech. Never use this to commit a
// turn, stop listening, or report true acoustic end-to-end latency.
export class TurnTiming {
  constructor(){this.reset();}
  reset(){this.turn=0;this.lastEnergy=null;this.frames=0;this.started=null;this.final=null;this.finalEnergy=null;this.reported=false;}
  sample(rms,at,playing=false){
    if(playing){this.frames=0;return;}
    this.frames=Number.isFinite(rms)&&rms>.025?this.frames+1:0;
    if(this.frames>=3)this.lastEnergy=at;
  }
  userStarted(at){
    this.turn++;this.started=at;this.final=null;this.finalEnergy=null;this.reported=false;
    if(this.lastEnergy!==null&&at-this.lastEnergy>10000)this.lastEnergy=null;
  }
  inputCompleted(at){
    if(this.started===null)return null;
    this.final=at;this.finalEnergy=this.lastEnergy;
    return {stage:'asr_final',turn:this.turn,asrWindowMs:at-this.started,lastEnergyToAsrMs:this.finalEnergy===null?null:at-this.finalEnergy};
  }
  firstAudio(at){
    if(this.final===null||this.reported)return null;
    this.reported=true;
    this.lastEnergy=null;this.frames=0;
    return {stage:'first_audio_scheduled',turn:this.turn,asrToFirstAudioMs:at-this.final,lastEnergyToFirstAudioMs:this.finalEnergy===null?null:at-this.finalEnergy};
  }
}

// Browser messages are untrusted. Keep fixed, bounded structural fields only.
export function timingDiagnostic(event){
  if(!['asr_final','first_audio_scheduled'].includes(event.stage)||!Number.isInteger(event.turn)||event.turn<1||event.turn>100000)return null;
  const out={type:'local.turn_timing',stage:event.stage,turn:event.turn,method:'rms_proxy_not_speech_endpoint'};
  for(const key of ['asrWindowMs','lastEnergyToAsrMs','asrToFirstAudioMs','lastEnergyToFirstAudioMs','captureQueueMs','playbackQueueMs','outputBaseLatencyMs']){
    out[key]=Number.isFinite(event[key])&&event[key]>=0?Math.round(Math.min(600000,event[key])):null;
  }
  out.contextState=['running','suspended','closed','interrupted'].includes(event.contextState)?event.contextState:'unknown';
  return out;
}
