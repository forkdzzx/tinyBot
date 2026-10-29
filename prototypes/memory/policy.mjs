// Conservative command/scope rules. User text remains in history even when it
// is unsuitable for durable memory. These rules are not a semantic classifier.
const quoted = /[“”"「」『』]/u;
export function explicitRemember(text) {
  if (typeof text !== 'string' || quoted.test(text) ||
      /(?:不要|别|不用|不必|不需要|不能|无法).{0,4}(?:记|保存)|(?:don't|do not|never)\s+(?:remember|save)/iu.test(text)) return false;
  // Accept conversational lead-ins, including ASR without punctuation, but not
  // arbitrary occurrences in questions, hypothetical examples or reported speech.
  return /^(?:(?:我想说一下|我想补充一下|还有一件事|另外|对了|嗯)[，,。:\s]*)*(?:请你|请帮我|请|麻烦你|帮我)?\s*(?:记住|记一下|记下)(?!是什么意思|怎么|了吗|吗|了没)/u.test(text.trim()) ||
    /^(?:(?:by the way|also)[,.:\s]*)?(?:please\s+)?remember\b(?!\s+(?:what|how|when|why)\b)/iu.test(text.trim());
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
