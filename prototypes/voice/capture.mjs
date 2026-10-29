// AudioContext performs device-rate conversion to 16 kHz before this worklet.
class Capture extends AudioWorkletProcessor {
  constructor() { super();this.frame=new Int16Array(320);this.index=0;this.energy=0; }
  process(inputs) {
    const channel=inputs[0]?.[0];
    if(!channel)return true;
    for(const value of channel) {
      const v=Math.max(-1,Math.min(1,value));
      this.frame[this.index++]=Math.round(v<0?v*32768:v*32767);this.energy+=v*v;
      if(this.index===320) {
        this.port.postMessage({samples:this.frame,rms:Math.sqrt(this.energy/320)});
        this.frame=new Int16Array(320);this.index=0;this.energy=0;
      }
    }
    return true;
  }
}
registerProcessor('jarvis-capture',Capture);
