import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionLifecycle, sessionCommand, IDLE_MS, WAIT_MS} from '../prototypes/voice/lifecycle.mjs';
function fixture(){
  let now=0,id=0;const tasks=new Map(),ends=[];
  const clock={setTimeout(fn,delay){tasks.set(++id,{at:now+delay,fn});return id;},clearTimeout(id){tasks.delete(id);}};
  const advance=ms=>{now+=ms;for(const [id,t] of [...tasks])if(t.at<=now){tasks.delete(id);t.fn();}};
  return {state:new SessionLifecycle(reason=>ends.push(reason),clock),advance,ends};
}
test('idle ends at 2 minutes after readiness; background activity postpones it',()=>{
  const {state,advance,ends}=fixture();state.ready();advance(IDLE_MS-1);assert.equal(ends.length,0);
  state.activity();advance(IDLE_MS-1);assert.equal(ends.length,0);advance(1);assert.deepEqual(ends,['silence_timeout']);
});
test('user speech, generation and playback invalidate the old silence deadline',()=>{
  const {state,advance,ends}=fixture();state.ready();advance(IDLE_MS-1);state.userStarted();advance(IDLE_MS);
  state.inputCompleted('为什么天空是蓝色');advance(IDLE_MS);state.outputStarted();advance(IDLE_MS);
  assert.equal(ends.length,0);state.playbackEnded();advance(IDLE_MS-1);assert.equal(ends.length,0);
  advance(1);assert.deepEqual(ends,['silence_timeout']);
});
test('extended waiting suppresses output and expires after 10 minutes',()=>{
  const {state,advance,ends}=fixture();state.ready();state.inputCompleted('等一下，我想想。');
  state.outputStarted();state.playbackEnded();state.interrupted();state.activity();
  assert.equal(state.phase,'waiting');advance(WAIT_MS-1);assert.equal(ends.length,0);
  advance(1);assert.deepEqual(ends,['wait_timeout']);
});
test('speaking during extended waiting resumes without an old timer ending the turn',()=>{
  const {state,advance,ends}=fixture();state.ready();state.inputCompleted('让我想想');advance(WAIT_MS-1);
  state.userStarted();advance(2);assert.equal(state.phase,'user');assert.equal(ends.length,0);
  state.inputCompleted('继续解释吧');state.outputStarted();state.playbackEnded();advance(IDLE_MS);
  assert.deepEqual(ends,['silence_timeout']);
});
test('interruption gets a fresh idle deadline; disposed sessions cannot time out later',()=>{
  const {state,advance,ends}=fixture();state.ready();state.outputStarted();state.interrupted();advance(IDLE_MS-1);
  assert.equal(ends.length,0);state.dispose();advance(WAIT_MS);assert.equal(ends.length,0);
});
test('stop commands end once; quoted or negated examples are not commands',()=>{
  const {state,advance,ends}=fixture();state.ready();assert.equal(state.inputCompleted('停止聊天！'),'end');
  advance(WAIT_MS);assert.deepEqual(ends,['command']);
  for(const text of ['不要停止聊天','他说“停止聊天”是什么意思','等一下，我想想，这是什么？'])assert.equal(sessionCommand(text),null);
});
test('natural endings close the session without treating discussion or other tasks as stop commands',()=>{
  for(const text of ['我又有点不想聊天了，先结束吧。','OK，可以结束。','先结束吧','今天先不聊了','我们结束聊天吧']){
    const {state,ends,advance}=fixture();state.ready();assert.equal(state.inputCompleted(text),'end',text);advance(WAIT_MS);assert.deepEqual(ends,['command']);
  }
  for(const text of ['不要结束聊天','先不要结束','可以结束吗？','你说“先结束吧”是什么意思','如果我说先结束吧','这个游戏可以结束','结束任务','好，可以结束这个项目','等一下我想想，这题怎么做','我们为什么要结束聊天'])assert.equal(sessionCommand(text),null,text);
});
