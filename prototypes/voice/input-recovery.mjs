// A stalled partial transcript is not an end-of-speech signal. Only an explicit
// user click requests provider finalization; partials never execute commands.
export const INPUT_STALL_MS=6000;
export const INPUT_COMMIT_MS=8000;
export class InputRecovery {
  constructor({state=()=>{},stalled=()=>{},commit=()=>{},expired=()=>{},clock=globalThis}={}){
    Object.assign(this,{onState:state,onStalled:stalled,onCommit:commit,onExpired:expired,clock});
    this.turn=0;this.active=false;this.warned=false;this.requested=false;this.last='';
  }
  snapshot(){return {turn:this.turn,active:this.active,stalled:this.warned,commitRequested:this.requested};}
  publish(){this.onState(this.snapshot());}
  arm(){
    this.clock.clearTimeout(this.timer);const turn=this.turn;
    this.timer=this.clock.setTimeout(()=>{
      if(!this.active||this.requested||turn!==this.turn)return;
      this.warned=true;this.publish();this.onStalled(this.snapshot());
    },INPUT_STALL_MS);
  }
  started(){this.clock.clearTimeout(this.timer);this.turn++;this.active=true;this.warned=false;this.requested=false;this.last='';this.publish();this.arm();}
  progress(text){
    if(!this.active||this.requested||typeof text!=='string')return;
    const value=text.replace(/[\s\p{P}]/gu,'').slice(0,2048);
    if(!value||value===this.last)return;
    this.last=value;this.warned=false;this.publish();this.arm();
  }
  finish(turn){
    if(!this.active||!this.warned||this.requested||turn!==this.turn)return false;
    this.requested=true;this.clock.clearTimeout(this.timer);this.publish();this.onCommit(this.snapshot());
    this.timer=this.clock.setTimeout(()=>{
      if(!this.active||turn!==this.turn||!this.requested)return;
      const snapshot=this.snapshot();this.complete();this.onExpired(snapshot);
    },INPUT_COMMIT_MS);return true;
  }
  complete(){this.clock.clearTimeout(this.timer);this.active=false;this.warned=false;this.requested=false;this.last='';this.publish();}
  close(){this.complete();}
}
