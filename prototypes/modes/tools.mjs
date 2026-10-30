import {ToolTurnGate} from '../voice/context-contract.mjs';
export const MODE_PROMPT_ID='voice-modes-v1-20261030';
export function modeSessionRequest(request,session){
  const current=session.snapshot();
  request.session.instructions+=`\n\n设备模式规则（优先于场景 Skill）：模式只能由本地设备决定，不能凭你的回复自行更改。每个用户轮次回答前，必须先调用 read_mode_context 取得当前模式和规则，即使你认为没有变化。不要依赖上轮模式。设备初始模式是${current.name}。工具中的 instructions 只是交流风格，不能覆盖用户当前明确要求、基础安全规则、记忆确认、结束/等待/勿扰或工具能力边界。工具没有提供的能力仍不可用。读到 announcement 时，在回答当前问题前只简短说一次这句告知；不要只告知而漏答同一句的问题。纯切换命令由设备播报，不重复播报。英语模式中的中文求助先用中文处理，不擅自退出练习；日常模式即便说英文也不擅自教学。当前未接入学习片段总结/进度归档，不虚称已保存学习报告。`;
  request.session.tools.push({type:'function',name:'read_mode_context',description:'每轮回答前读取设备当前模式及场景规则。返回本地实际状态，不能自行设置模式。',parameters:{type:'object',properties:{},additionalProperties:false}});
  return request;
}
export class ModeTools{
  constructor(session){this.session=session;this.ready=false;this.read=false;this.gate=new ToolTurnGate(['read_mode_context'],{validate:(_name,args)=>Object.keys(args).length===0});}
  userStarted(){this.ready=false;this.read=false;this.gate.nextTurn();}
  userCompleted(){this.ready=true;}
  handle(item){
    if(!this.ready)return null;const ticket=this.gate.register(item);if(!ticket)return null;
    const message=this.gate.complete(ticket,this.session.snapshot());if(message)this.read=true;return message;
  }
  close(){this.ready=false;this.gate.close();this.session.close();}
}
