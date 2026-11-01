import test from 'node:test';
import assert from 'node:assert/strict';
import {ModeController,modeCommand} from '../prototypes/modes/controller.mjs';
import {practiceEnd} from '../prototypes/learning/intents.mjs';

const practiceRequests=[
  'I just want the English practice, oral practice.',
  'I want to practice English.',
  "Let's practice English.",
  'Can we practice spoken English?',
  "I'd like some English speaking practice.",
  'Can you help me practice English?',
];

test('explicit English practice requests enter the local English mode',()=>{
  for(const text of practiceRequests){
    assert.deepEqual(modeCommand(text),{type:'manual',mode:'english',rest:''},text);
    const controller=new ModeController(),session=controller.begin();
    const result=session.input(text);
    assert.equal(result.handled,true,text);
    assert.equal(result.change.source,'manual',text);
    assert.equal(result.change.previous,'daily',text);
    assert.equal(result.change.mode,'english',text);
    assert.equal(session.snapshot().id,'english',text);
  }
});

test('practice requests tolerate spoken punctuation, casing and apostrophes',()=>{
  for(const text of [
    '  I WANT TO PRACTICE ENGLISH!  ',
    'I want to practise English.',
    'Let’s practice English!',
    'I’d like some English speaking practice.',
    'Can we   practice spoken English?',
    'Please, help me practice English.',
    '嗯，I just want the English practice, oral practice.',
  ])assert.deepEqual(modeCommand(text),{type:'manual',mode:'english',rest:''},text);
});

test('a language preference or ordinary English conversation does not enter practice mode',()=>{
  for(const text of [
    'I want to say some English.',
    'I want to say English.',
    'I want to speak English.',
    'Can we speak English?',
    "Let's speak English.",
    'I speak English.',
    'I practice English every day.',
    'English practice is useful.',
    'English practice.',
    "What's your name?",
    'How was your day?',
  ]){
    assert.equal(modeCommand(text),null,text);
    const session=new ModeController().begin();
    assert.equal(session.input(text).handled,false,text);
    assert.equal(session.snapshot().id,'daily',text);
  }
});

test('questions, quotations, hypothetical requests and negation are not practice commands',()=>{
  for(const text of [
    'What does English practice mean?',
    'Explain English speaking practice.',
    'How do I ask someone to practice English?',
    'Can you translate I want to practice English into Chinese?',
    '“I want to practice English.”',
    '"Can we practice spoken English?"',
    "'Let's practice English.'",
    'She said I want to practice English.',
    'If I want to practice English, what should I do?',
    'Suppose I want to practice English.',
    'I might want to practice English.',
    "I don't want to practice English.",
    "Don't practice English.",
    "Let's not practice English.",
    "I just don't want the English practice, oral practice.",
    'I do not want English speaking practice.',
    '不要把 I want to practice English 当作指令。',
  ])assert.equal(modeCommand(text),null,text);
});

test('phrase lists and compound requests remain available to ordinary conversation',()=>{
  for(const text of [
    'practice English, English practice, oral practice',
    'List these phrases: practice English, oral practice.',
    'I want to practice English, study grammar, and read a story.',
    'I want to practice English and French.',
    'I want to practice English. Tell me a joke first.',
    "Let's practice English, then help me debug this code.",
    'Can you help me practice English and plan my trip?',
    'I just want the English practice, oral practice, and help with my homework.',
    'I want English practice, not oral practice.',
    'I want to practice English，先帮我解释这个单词。',
    '先解释一下英语练习，然后 I want to practice English.',
  ]){
    assert.equal(modeCommand(text),null,text);
    const session=new ModeController().begin();
    assert.equal(session.input(text).handled,false,text);
    assert.equal(session.snapshot().id,'daily',text);
  }
});

test('the observed request sequence enters English before the first Chinese practice ending',()=>{
  const controller=new ModeController(),session=controller.begin();
  assert.equal(session.input('I want to say some English.').handled,false);
  assert.equal(session.snapshot().id,'daily');
  assert.equal(session.input('I just want the English practice, oral practice.').change.mode,'english');
  for(const text of ['I like playing football.','这个单词什么意思，用中文解释','我正在写代码','Java 接口和抽象类']){
    assert.equal(session.input(text).handled,false,text);
    assert.equal(session.snapshot().id,'english',text);
  }
  const ending='今天先练到这里吧';
  assert.equal(practiceEnd(ending),true);
  assert.deepEqual(modeCommand(ending),{type:'manual',mode:'daily',rest:''});
  const result=session.input(ending);
  assert.equal(result.handled,true);
  assert.equal(result.change.previous,'english');
  assert.equal(result.change.mode,'daily');
  assert.equal(result.change.source,'manual');
  assert.equal(session.snapshot().id,'daily');
});

test('repeated English practice requests preserve the current mode revision',()=>{
  const controller=new ModeController(),session=controller.begin();
  session.input(practiceRequests[0]);
  const revision=session.snapshot().revision;
  for(const text of practiceRequests){
    const result=session.input(text);
    assert.equal(result.handled,true,text);
    assert.equal(result.change,null,text);
    assert.equal(session.snapshot().revision,revision,text);
    assert.equal(session.snapshot().id,'english',text);
  }
});

test('English practice entry reuses manual switching and session mode persistence',()=>{
  const controller=new ModeController(),session=controller.begin();
  session.input('我正在写代码');
  session.input('不要切换');
  assert.equal(session.snapshot().autoLocked,true);
  assert.equal(session.input('Can you help me practice English?').change.source,'manual');
  assert.equal(session.snapshot().autoLocked,true);
  session.close();
  const next=controller.begin();
  assert.equal(next.snapshot().id,'english');
  assert.equal(next.snapshot().autoLocked,false);
  assert.equal(next.input('今天先练到这里吧').change.mode,'daily');
  assert.equal(new ModeController().current,'daily');
});
