import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PROMPT_V3 } from './prompt-v3.mjs';

export const ACTIVE_PROMPT_ID = 'voice-v3-20261025';

export const ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue';
export function loadConfig() {
  const env = parseEnv(readFileSync(new URL('../../runtime/volcengine.env', import.meta.url), 'utf8'));
  const key = env.VOLCENGINE_SPEECH_API_KEY?.trim();
  if (!key || /你的|真实|填写|placeholder/i.test(key)) throw new Error('本地语音凭证未正确填写');
  return { key, voice: env.VOLCENGINE_SPEECH_VOICE || 'zh_female_vv_jupiter_bigtts' };
}
export function sessionCreate(voice) {
  return {
    type: 'session.create',
    session: {
      model: '1.2.6.1',
      instructions: PROMPT_V3,
      audio: {
        input: { format: { type: 'pcm', rate: 16000 } },
        output: { format: { type: 'pcm_s16le', rate: 24000 }, voice, speed: 0, loudness: 0 },
      },
    },
  };
}
