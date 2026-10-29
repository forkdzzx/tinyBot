// Browser-independent session timing. Playback completion, not generation completion,
// starts the silence clock. The clock is injectable for boundary/race tests.
import {stripSpokenLeadIn} from './intent-text.mjs';
export const IDLE_MS = 120_000;
export const WAIT_MS = 600_000;
export function sessionCommand(text) {
  if (/[“”"「」『』?？]/u.test(String(text))) return null;
  const normalized = stripSpokenLeadIn(text).toLowerCase().replace(/[\s\p{P}]/gu, '');
  if (/^(?:(?:ok|好的|好|嗯|那就|那|我们|今天|我又有点不想聊天了|我有点不想聊天了|我不想聊天了))*(?:请|请你|可以|先)?(?:结束聊天|停止聊天|结束对话|停止对话|结束|不聊了|先不聊了)(?:吧|了|啦|谢谢)?$/u.test(normalized) || ['endtheconversation','stopchatting'].includes(normalized)) return 'end';
  if (['等一下我想想','等一下让我想想','让我想想','等我想想','waitletmethink','letmethink'].includes(normalized)) return 'wait';
  return null;
}
export class SessionLifecycle {
  constructor(onEnd, clock = globalThis) { this.onEnd=onEnd; this.clock=clock; this.phase='standby'; this.revision=0; }
  set(phase, delay) {
    this.clock.clearTimeout(this.timer); this.phase=phase; const revision=++this.revision;
    if(delay) this.timer=this.clock.setTimeout(()=>{
      if(revision!==this.revision)return;
      this.set('standby'); this.onEnd(phase==='waiting'?'wait_timeout':'silence_timeout');
    },delay);
  }
  ready() { this.set('listening',IDLE_MS); }
  userStarted() { if(this.phase!=='standby')this.set('user'); }
  inputCompleted(text) {
    if(this.phase==='standby')return null;
    const command=sessionCommand(text);
    if(command==='end'){this.set('standby');this.onEnd('command');}
    else if(command==='wait')this.set('waiting',WAIT_MS);
    else this.set('thinking');
    return command;
  }
  outputStarted() { if(!['standby','waiting'].includes(this.phase))this.set('speaking'); }
  playbackEnded() { if(['speaking','thinking'].includes(this.phase))this.ready(); }
  interrupted() { if(!['standby','waiting'].includes(this.phase))this.ready(); }
  // Local speech energy protects the idle deadline before cloud ASR catches up.
  activity() { if(this.phase==='listening')this.ready(); }
  dispose() { this.set('standby'); }
}
