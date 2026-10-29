// Aggregate input health only. No PCM, reconstructed audio or speech text retained.
export class WakeInputStats {
  constructor(){this.clear();}
  clear(){this.frames=0;this.energy=0;this.peak=0;this.clipped=0;this.audibleFrames=0;}
  add(pcm){
    let energy=0;
    for(let i=0;i<pcm.length;i+=2){
      const sample=pcm.readInt16LE(i)/32768;energy+=sample*sample;
      this.peak=Math.max(this.peak,Math.abs(sample));if(Math.abs(sample)>.99)this.clipped++;
    }
    this.frames++;this.energy+=energy;
    if(Math.sqrt(energy/320)>.01)this.audibleFrames++;
  }
  take(){
    const out={frames:this.frames,audioMs:this.frames*20,
      rms:this.frames?Math.round(Math.sqrt(this.energy/(this.frames*320))*10000)/10000:0,
      peak:Math.round(this.peak*10000)/10000,clippedSamples:this.clipped,audibleFrames:this.audibleFrames};
    this.clear();return out;
  }
}
