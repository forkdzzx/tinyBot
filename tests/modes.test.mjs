import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ModeController,loadSkills,DEFAULT_SKILLS,modeCommand} from '../prototypes/modes/controller.mjs';
import {ModeTools,modeSessionRequest,modeContextMessage} from '../prototypes/modes/tools.mjs';
import {memorySession} from '../prototypes/memory/tools.mjs';
test('four text skills load and a new controller starts in daily',()=>{const c=new ModeController();assert.deepEqual(Object.keys(c.skills),['daily','work','companion','english']);assert.equal(c.current,'daily');});
test('missing, invalid and executable skill fields fail rather than loading empty instructions',t=>{
  const root=mkdtempSync(join(tmpdir(),'jarvis-skills-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  assert.throws(()=>loadSkills(root),/SKILL_INVALID_daily/);cpSync(DEFAULT_SKILLS,root,{recursive:true});
  writeFileSync(join(root,'work.json'),JSON.stringify({id:'work',name:'工作',instructions:'hello',execute:'sh'}));assert.throws(()=>loadSkills(root),/SKILL_INVALID_work/);
  writeFileSync(join(root,'work.json'),'{bad');assert.throws(()=>loadSkills(root),/SKILL_INVALID_work/);
});
test('edited skill text takes effect on reload but does not mutate the running controller',t=>{
  const root=mkdtempSync(join(tmpdir(),'jarvis-skills-'));t.after(()=>rmSync(root,{recursive:true,force:true}));cpSync(DEFAULT_SKILLS,root,{recursive:true});const before=new ModeController(loadSkills(root));
  writeFileSync(join(root,'daily.json'),JSON.stringify({id:'daily',name:'日常',instructions:'每次给一个具体例子。'}));assert.notEqual(before.skills.daily.instructions,new ModeController(loadSkills(root)).skills.daily.instructions);
});
test('manual switching and English exit use natural requests without false positives',()=>{
  for(const [text,id] of [['进入工作模式','work'],['陪我练英语','english'],['我想练习口语','english'],['陪我看球','companion'],['不练英语，只是聊天','daily']])assert.equal(modeCommand(text).mode,id);
  for(const text of ['不要进入工作模式','他说“陪我练英语”','如果进入工作模式会怎样','英语模式是什么意思？',"What's your name?"])assert.equal(modeCommand(text),null,text);
  assert.equal(modeCommand('进入工作模式，解释一下 Java 接口').rest,'解释一下 Java 接口');
});
test('ordinary keywords do not switch, while sustained topics and direct activity do',()=>{
  const s=new ModeController().begin();assert.equal(s.input('Java').change,undefined);assert.equal(s.input('Java 接口和抽象类有什么区别').change,undefined);
  assert.equal(s.input('继承和多态有什么关系').change.mode,'work');
  const other=new ModeController().begin();assert.equal(other.input('我正在看英超比赛').change.mode,'companion');
});
test('rollback restores prior automatic mode and locks only this conversation, including across manual changes',()=>{
  const c=new ModeController(),s=c.begin();s.input('我正在写代码');assert.equal(c.current,'work');assert.equal(s.input('不要切换').change.mode,'daily');assert.equal(s.autoLocked,true);
  s.input('进入陪伴模式');s.input('我正在写代码');s.input('Java 线程和接口');assert.equal(c.current,'companion');
  s.close();const next=c.begin();assert.equal(next.autoLocked,false);assert.equal(next.input('我正在写代码').change.mode,'work');
});
test('session end retains current mode and a process controller restart resets it',()=>{
  const c=new ModeController(),s=c.begin();s.input('陪我练英语');s.close();assert.equal(c.begin().snapshot().id,'english');assert.equal(new ModeController().current,'daily');assert.throws(()=>s.input('你好'),/CLOSED/);
});
test('Chinese help and topics inside an English exercise do not automatically leave it',()=>{
  const c=new ModeController(),s=c.begin();s.input('陪我练英语');s.input('这个单词什么意思，用中文解释');s.input('我正在写代码');s.input('Java 接口和抽象类');assert.equal(c.current,'english');s.input('不练英语，只是聊天');assert.equal(c.current,'daily');
});
test('topic switches have a cooldown and unrelated or quoted input resets weak topic evidence',()=>{
  const c=new ModeController(),s=c.begin();s.input('我正在写代码');assert.equal(s.input('我正在看比赛').change,undefined);assert.equal(s.input('我正在看比赛').change.mode,'companion');
  const other=new ModeController().begin();other.input('Java 接口和抽象类');other.input('他说“我正在写代码”');assert.equal(other.input('代码和数据库').change,undefined);
});
test('mode tool always reads the latest host state and rejects stale or duplicate calls',()=>{
  const scope=new ModeController().begin(),tool=new ModeTools(scope);const call={name:'read_mode_context',call_id:'a',arguments:'{}'};assert.equal(tool.handle(call),null);
  tool.userStarted();tool.userCompleted();scope.input('进入工作模式');const x=tool.handle(call);assert.equal(JSON.parse(x.items[0].content[0].text).id,'work');assert.equal(tool.read,true);assert.equal(tool.handle(call),null);
  tool.userStarted();assert.equal(tool.read,false);assert.equal(tool.handle({...call,call_id:'b'}),null);tool.userCompleted();assert.equal(tool.handle({...call,call_id:'c',arguments:'{"mode":"english"}'}),null);tool.close();
});
test('mode context adds a read-only tool without losing memory tools or base constraints',()=>{
  const r=modeSessionRequest(memorySession('test'),new ModeController().begin());assert.deepEqual(r.session.tools.map(x=>x.name),['read_local_context','remember_user_fact','ask_memory_confirmation','read_mode_context']);assert.match(r.session.instructions,/不要求普通聊天每轮调用/);assert.match(r.session.instructions,/不能覆盖/);
});

test('mode context identifies device state and does not fabricate a user or tool reply',()=>{const s=new ModeController().begin();s.input('陪我练英语');const message=modeContextMessage(s);assert.equal(message.items[0].role,'assistant');assert.match(message.items[0].content[0].text,/Jarvis设备状态/);assert.equal(JSON.parse(message.items[0].content[0].text.split('] ')[1]).id,'english');assert.equal(message.items[0].call_id,undefined);});
