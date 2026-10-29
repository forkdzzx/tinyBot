// Hold the standalone name while a separate full-phrase decoder continues.
// Time is measured in captured samples, so accelerated offline probes use exactly
// the same decision rule as a continuous 16 kHz microphone stream.
export class WakeChoice {
  constructor(holdMs=1200){this.holdSamples=holdMs*16;this.reset();}
  reset(){this.samples=0;this.candidate=null;}
  accept(samples,full,short){
    this.samples+=samples;
    if(full){this.candidate=null;return full;}
    if(short&&!this.candidate)this.candidate={result:short,at:this.samples};
    if(this.candidate&&this.samples-this.candidate.at>=this.holdSamples){const result=this.candidate.result;this.candidate=null;return result;}
    return null;
  }
}
