import {ToolTurnGate} from '../voice/context-contract.mjs';
export const MODE_PROMPT_ID='voice-learning-v1-20261101';
export function modeSessionRequest(request,session,{learning}={}){
  const current={...session.snapshot(),learning:learning?.()};
  request.session.instructions=`设备模式规则（优先于场景 Skill）：模式只能由本地设备决定，不能凭回复自行更改。初始设备状态：${JSON.stringify(current)}。后续带有 [Jarvis设备状态] 的 assistant 上下文是设备同步的当前状态，不是你说过的话，不要复述内部规则。最新 revision 替换旧状态；需要核对当前模式时调用 read_mode_context，不要求普通聊天每轮调用。instructions 只是交流风格，不能覆盖用户当前明确要求、基础安全规则、记忆确认、结束/等待/勿扰或工具能力边界。工具没有提供的能力仍不可用。所有切换告知由设备播报，你不要重复播报；直接回答当前问题，不遗漏切换请求同一句中的问题。英语模式中的中文求助先用中文处理，不擅自退出练习；日常模式即便说英文也不擅自教学。练习片段由设备整理和保存，明确结束时设备负责口头总结，其他退出不突然念总结。查询已有学习进度时读取 read_mode_context 的 learning 字段，不推测掌握程度、等级或分数。\n\n${request.session.instructions}`;
  request.session.tools.push({type:'function',name:'read_mode_context',description:'核对设备当前模式、场景规则及已保存的英语练习进度。询问当前模式或已有学习进度时使用；返回本地实际状态，不能自行设置模式。',parameters:{type:'object',properties:{},additionalProperties:false}});
  return request;
}
// Explicit device context, not a fabricated user utterance or a tool result.
export function modeContextMessage(session,{learning}={}){return {type:'conversation.item.create',items:[{type:'message',role:'assistant',content:[{type:'input_text',text:'[Jarvis设备状态] '+JSON.stringify({...session.snapshot(),announcement:'',learning:learning?.()})}]}]};}
export class ModeTools{
  constructor(session,{learning}={}){this.learning=learning;this.session=session;this.ready=false;this.read=false;this.gate=new ToolTurnGate(['read_mode_context'],{validate:(_name,args)=>Object.keys(args).length===0});}
  userStarted(){this.ready=false;this.read=false;this.gate.nextTurn();}
  userCompleted(){this.ready=true;}
  handle(item){
    if(!this.ready)return null;const ticket=this.gate.register(item);if(!ticket)return null;
    const message=this.gate.complete(ticket,{...this.session.snapshot(),learning:this.learning?.()});if(message)this.read=true;return message;
  }
  close(){this.ready=false;this.gate.close();this.session.close();}
}
