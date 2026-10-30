// Conservative command/scope rules. User text remains in history even when it
// is unsuitable for durable memory. These rules are not a semantic classifier.
const quoted = /[“”"「」『』]/u;
import {stripSpokenLeadIn} from '../voice/intent-text.mjs';
export function explicitRemember(text) {
  if (typeof text !== 'string' || quoted.test(text) ||
      /(?:不要|别|不用|不必|不需要|不能|无法).{0,4}(?:记|保存)|(?:don't|do not|never)\s+(?:remember|save)/iu.test(text)) return false;
  // A self-correction can start with "不不不，我说的是". Only remove the
  // repeated interjection when it is immediately tied to a self-correction;
  // actual negative commands are still rejected above and by the grammar below.
  let command=stripSpokenLeadIn(text).replace(/^(?:不[，,\s]*){1,4}(?=我说的是|我是说)/u,'');
  command=command.replace(/^(?:(?:我想说一下|我想补充一下|还有一件事|另外|对了|我说的是|我是说)[，,。:：\s]*)*/u,'');
  return /^(?:(?:请你|请帮我|请|麻烦你|帮我)|你(?:也|还)?(?:要|得|需要))?\s*(?:记住|记一下|记下)(?!是什么意思|怎么|了吗|吗|了没)/u.test(command) ||
    /^(?:(?:by the way|also)[,.:\s]*)?(?:please\s+)?remember\b(?!\s+(?:what|how|when|why)\b)/iu.test(command);
}
export function memoryQuoteCore(text){
  return explicitRemember(text)?text.replace(/^.*?(?:记住|记一下|记下)(?:这个[，,:：\s]+)?[，,:：\s]*/u,''):text;
}

export function sessionOnlyMemory(quote, sourceText = quote) {
  // Use the source clause as well as the quoted fragment: an extractor may
  // shorten "今天我想说中文" to "我想说中文", losing its time qualifier.
  const clauses = sourceText.split(/[。！？!?；;\n]/u);
  const context = clauses.find(s => s.includes(quote)) || quote;
  const language = /中文|英文|英语|汉语|普通话|\b(?:Chinese|English)\b/iu;
  const languageAction = /说|用|讲|聊|交流|回答|回复|解释|切换|练|\b(?:speak|talk|answer|reply|switch|use|practice)\b/iu;
  const styleAction = /(?:回答|回复|说|讲|解释).{0,10}(?:简短|短一点|详细|长一点|慢一点|快一点)|(?:简短|详细).{0,6}(?:回答|回复|解释)|\b(?:answer|reply|speak).{0,20}(?:brief|detail|slow|fast)/iu;
  if (!(language.test(quote) && languageAction.test(context)) && !styleAction.test(quote)) return false;
  // Learning goals are valuable cross-session facts, not conversation controls.
  if (/(?:目标|计划|坚持|每天|每周|半年|一年|明年).{0,24}(?:学|练|提高|提升).{0,12}(?:英语|英文)|(?:英语|英文).{0,12}(?:学习目标|学习计划)/u.test(context)) return false;
  const temporary = /今天|现在|这次|本次|这轮|这句|刚才|暂时|先用|先说|先讲|先聊|\b(?:now|today|this time|this session|for now)\b/iu.test(context);
  if (temporary) return true;
  const durable = /平时|通常|一直|长期|默认|以后|今后|每次|习惯|喜欢|偏好|\b(?:usually|always|prefer|by default|from now on)\b/iu.test(context);
  if (durable) return false;
  // Language/style instructions without an explicit persistent scope apply to
  // the current interaction; learning goals and language ability are not commands.
  return /(?:我想|我要|我不想|请|改|换|用|说|讲|陪我|帮我|不练)|\b(?:let'?s|please|can you|i want to|switch|speak|reply|answer)\b/iu.test(context);
}

// These fields can contain several simultaneous likes. Unknown/scalar fields
// remain conservative; an LLM cannot bypass a conflict by marking it additive.
const COLLECTION_KEYS=new Set(['preference.hobby','preference.drink','preference.food','preference.sport','preference.game.genre','preference.music']);
export function additivePreference(key,text,context=text){
  return COLLECTION_KEYS.has(key)&&
    /喜欢|爱好|偏爱|\b(?:like|enjoy|love)\b/iu.test(text)&&
    !/不|讨厌|只|最|唯一|改成|换成|替换|不再|以前|曾经|过去|\b(?:not|no longer|only|favorite|favourite|instead|used to)\b/iu.test(context);
}
export function confirmationDecision(text){
  if(typeof text!=='string'||/[“”"「」『』?？]/u.test(text))return null;
  const s=stripSpokenLeadIn(text).toLowerCase().replace(/[\s\p{P}]/gu,'');
  // Within an outstanding heard memory question, ASR may transcribe 记 as 计.
  // Match the whole affirmative action, never an isolated homophone or negation.
  if(/^(?:是的|对|没错)?按新的[记计]$/u.test(s))return 'accept';
  if(/^(?:对的?|是的|没错|好的?|确认)(?:就?(?:按|用)(?:新的|这个|这条)(?:记|计|保存|更新|替换)(?:吧)?)?$/u.test(s))return 'accept';
  if(['对','对的','是的','没错','确认','确认更新','确认替换','按新的记','对按新的记','是的按新的记','用新的替换','是的用新的替换','yes','yesplease','confirm'].includes(s))return 'accept';
  if(['不','不是','不对','不要替换','保留原来的','按原来的记','no','keeptheoldone'].includes(s))return 'reject';
  if(['先不改','以后再说','暂时不确认','先不确认','不确定','先放着','later','notsure','notnow'].includes(s))return 'defer';
  return null;
}
