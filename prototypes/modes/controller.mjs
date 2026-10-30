import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {stripSpokenLeadIn} from '../voice/intent-text.mjs';
export const MODE_IDS=Object.freeze(['daily','work','companion','english']);
export const DEFAULT_SKILLS=fileURLToPath(new URL('./skills/',import.meta.url));
export function loadSkills(root=DEFAULT_SKILLS){
  const skills={};
  for(const id of MODE_IDS){
    try{
      const raw=readFileSync(join(root,`${id}.json`),'utf8');if(Buffer.byteLength(raw)>6000)throw new Error();
      const s=JSON.parse(raw);if(!s||s.id!==id||typeof s.name!=='string'||!s.name.trim()||s.name.length>20||typeof s.instructions!=='string'||!s.instructions.trim()||s.instructions.length>1800||Object.keys(s).some(k=>!['id','name','instructions'].includes(k)))throw new Error();
      skills[id]=Object.freeze(s);
    }catch{throw new Error(`SKILL_INVALID_${id}`);}
  }
  return Object.freeze(skills);
}
const names={'日常':'daily','聊天':'daily','工作':'work','陪伴':'companion','游戏':'companion','看球':'companion','英语':'english','英语练习':'english'};
export function modeCommand(text){
  if(typeof text!=='string'||/[“”"「」『』]/u.test(text))return null;
  const s=stripSpokenLeadIn(text).replace(/[。.!！]+$/u,'').trim();
  if(/^(?:请)?(?:不要切换|别切换|不要自动切换|别自动切换)(?:模式)?(?:了)?$/u.test(s))return {type:'rollback',rest:''};
  if(/^(?:不练英语了?|停止英语练习|退出英语(?:练习)?)(?:[，,\s]*(?:只是聊天|随便聊聊|正常聊天|回到日常模式))?$/u.test(s)||s==='今天练到这里')return {type:'manual',mode:'daily',rest:''};
  const m=s.match(/^(?:请|帮我)?(?:进入|切换到|切到|换成|回到)(日常|聊天|工作|陪伴|游戏|看球|英语练习|英语)模式(?:[，,:：]\s*(.+))?$/u);
  if(m)return {type:'manual',mode:names[m[1]],rest:m[2]||''};
  const practice=s.match(/^(?:请|我想|我想要)?(?:陪我|我们来|开始)?(?:练英语|练习英语|练习英语口语|练习口语|练口语)(?:吧)?(?:[，,:：]\s*(.+))?$/u);
  if(practice)return {type:'manual',mode:'english',rest:practice[1]||''};
  if(/^(?:请)?陪我(?:打游戏|玩游戏|看球|看比赛)(?:吧)?$/u.test(s))return {type:'manual',mode:'companion',rest:''};
  return null;
}
function topic(text){
  if(/[“”"「」『』]|^(?:如果|假如|假设|他说|她说|不要|不想)/u.test(text)||/记住|记下/u.test(text))return null;
  if(/我(?:(?:现在|刚刚)?在|正在)(?:写代码|调试|编程)|帮我(?:调试|分析代码)/u.test(text))return {mode:'work',strong:true};
  if(/我(?:(?:现在|刚刚)?在|正在)(?:打游戏|玩游戏|看球|看英超|看比赛)/u.test(text))return {mode:'companion',strong:true};
  const work=text.match(/\b(?:java|python|sql|javascript)\b|接口|抽象类|继承|多态|数据库|线程|代码|编程|调试/giu)||[];
  if(new Set(work.map(x=>x.toLowerCase())).size>=2)return {mode:'work',strong:false};
  if((text.match(/游戏|队友|射门|进球|英超|比赛|比分|球员/gu)||[]).length>=2)return {mode:'companion',strong:false};
  if((text.match(/周末|心情|朋友|生活|晚饭|早餐|旅行|电影/gu)||[]).length>=2)return {mode:'daily',strong:false};
  return null;
}
export class ModeController{
  constructor(skills=loadSkills()){this.skills=skills;this.current='daily';this.revision=0;}
  begin(){return new ModeSession(this);}
}
class ModeSession{
  constructor(owner){this.owner=owner;this.autoLocked=false;this.lastAuto=null;this.turn=0;this.lastChange=-10;this.streak=null;this.notice='';this.closed=false;}
  snapshot(){const s=this.owner.skills[this.owner.current];return {id:s.id,name:s.name,instructions:s.instructions,revision:this.owner.revision,autoLocked:this.autoLocked,announcement:this.notice};}
  change(mode,source){
    const previous=this.owner.current;if(mode===previous)return null;
    this.owner.current=mode;this.owner.revision++;this.lastChange=this.turn;this.streak=null;
    this.lastAuto=source==='automatic'?{from:previous,to:mode}:null;
    this.notice=`${source==='rollback'?'已回到':'已切换到'}${this.owner.skills[mode].name}模式。`;
    return {previous,mode,source,revision:this.owner.revision,announcement:this.notice};
  }
  input(text){
    if(this.closed)throw new Error('MODE_SESSION_CLOSED');this.turn++;this.notice='';
    const command=modeCommand(text);
    if(command?.type==='rollback'){
      this.autoLocked=true;this.streak=null;const target=this.lastAuto?.from;const change=target?this.change(target,'rollback'):null;this.lastAuto=null;
      return {handled:true,change,reply:(change?.announcement||'好，保持当前模式。')+'本次聊天不再自动切换。'};
    }
    if(command?.type==='manual'){
      this.lastAuto=null;this.streak=null;const change=this.change(command.mode,'manual');
      return {handled:!command.rest,change,reply:change?.announcement||`现在是${this.owner.skills[this.owner.current].name}模式。`};
    }
    // English answers and Chinese help belong to the exercise, even when their
    // subject is work or football. Leaving it requires a clear mode request.
    if(this.autoLocked||this.owner.current==='english')return {handled:false};
    const hint=topic(text);
    if(!hint||hint.mode===this.owner.current){this.streak=null;return {handled:false};}
    this.streak=this.streak?.mode===hint.mode?{mode:hint.mode,count:this.streak.count+1}:{mode:hint.mode,count:1};
    if(this.turn-this.lastChange<2||(!hint.strong&&this.streak.count<2))return {handled:false};
    return {handled:false,change:this.change(hint.mode,'automatic')};
  }
  close(){this.closed=true;}
}
