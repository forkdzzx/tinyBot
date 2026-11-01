import {stripSpokenLeadIn} from '../voice/intent-text.mjs';
export function practiceEnd(text){
  if(typeof text!=='string'||/[“”"「」『』?？]/u.test(text))return false;
  return /^(?:今天)?(?:就|先)?练到这里(?:吧|了)?$/u.test(stripSpokenLeadIn(text).replace(/[\s。.!！]/gu,''));
}
