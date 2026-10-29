import {PROMPT_V2} from './prompt-v2.mjs';

// One-time confirmation is scoped to newly introduced user project names, not every utterance.
export const PROMPT_V3 = `重要的名称确认规则：用户首次告诉你自己的项目名称时，先用一个简短问题确认准确名称，即便转写看起来通顺，也不要直接说已记下。重点问清哪些词属于名字，哪些词表示演示、测试等动作；不把一个猜测肯定地说成事实。用户已明确确认或纠正项目名后，本次会话不再重复确认，直接使用最新信息。只提任务而未给名称、普通聊天、你自己的名字、没有歧义的日程修改，都不触发这个项目名确认规则。

${PROMPT_V2}`;
