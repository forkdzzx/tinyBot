import assert from 'node:assert/strict';
import test from 'node:test';
import { VoicePresentation } from '../prototypes/voice/presentation.mjs';
import { PCMPlayer, PlaybackReceipts } from '../prototypes/voice/playback.mjs';

const audio = (p, id, text) => {
  p.accept({type:'response.output_text.done',response_id:id,text});
  p.accept({type:'response.output_audio.started',response_id:id});
};

test('cloud transcript or audio generation alone never starts the speaking face', () => {
  const p = new VoicePresentation();
  p.accept({type:'local.ready'});
  p.accept({type:'conversation.item.input_audio_transcription.delta',delta:'几点'});
  assert.equal(p.snapshot.caption,'几点');
  p.accept({type:'conversation.item.input_audio_transcription.completed',text:'几点了？'});
  audio(p,'a','现在九点。');
  assert.equal(p.snapshot.state,'thinking');
  assert.equal(p.snapshot.caption,'几点了？');
  p.onset('a');
  assert.deepEqual(p.snapshot,{state:'speaking',mode:'daily',caption:'现在九点。',responseId:'a'});
  audio(p,'b','还有十分钟。');
  assert.equal(p.snapshot.caption,'现在九点。');
  p.onset('b');
  p.onset('a');
  p.ended('a');
  assert.equal(p.snapshot.responseId,'b');
  p.ended('b');
  assert.equal(p.snapshot.state,'listening');
  assert.equal(p.snapshot.caption,'');
});

test('barge-in, wait, replacement response and closed session invalidate old callbacks', () => {
  const events = [];
  const p = new VoicePresentation((s,options) => events.push([s,options]));
  p.accept({type:'local.ready'});
  audio(p,'old','旧回答');
  p.onset('old');
  p.accept({type:'local.user_started'});
  assert.equal(events.at(-1)[1].interrupt,true);
  audio(p,'old','迟到的旧字幕');
  p.onset('old');p.ended('old');
  assert.equal(p.snapshot.state,'listening');
  assert.equal(p.snapshot.caption,'');
  p.accept({type:'local.waiting'});
  p.accept({type:'conversation.item.input_audio_transcription.completed',text:'等一下，我想想'});
  assert.equal(p.snapshot.state,'waiting');
  p.accept({type:'local.user_started'});
  audio(p,'b','新的码头');
  p.accept({type:'local.memory_result'});
  p.onset('b');
  assert.equal(p.snapshot.state,'thinking');
  audio(p,'memory','本地结果');
  p.onset('memory');
  assert.equal(p.snapshot.caption,'本地结果');
  p.dispose();
  p.accept({type:'local.ready'});
  p.onset('memory');
  assert.equal(p.snapshot.state,'idle');
});

test('accepted mode updates and rollback keep current phase and playing caption', () => {
  const events=[];
  const p=new VoicePresentation((s,options)=>events.push([s,options]));
  p.accept({type:'local.ready'});
  audio(p,'r','要回滚吗？');
  p.onset('r');
  for(const mode of ['work','english','daily','unknown','daily']) p.accept({type:'local.mode_state',id:mode});
  assert.deepEqual(events.map(([s])=>s.mode),['daily','daily','work','english','daily']);
  assert.deepEqual(p.snapshot,{state:'speaking',mode:'daily',caption:'要回滚吗？',responseId:'r'});
});

test('output start follows the running Web Audio graph; clear fences a saved timer and onended', () => {
  const timers = new Map();
  let timerId=0;
  const clock={setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
  function tick(){const callbacks=[...timers.values()];timers.clear();for(const cb of callbacks)cb();}
  const nodes=[];
  const ctx = {currentTime:0,state:'running',destination:{},
    createBuffer:(_c,n,hz)=>({duration:n/hz,getChannelData:()=>new Float32Array(n)}),
    createBufferSource(){const source={connect(){},disconnect(){},start(){},stop(){}};nodes.push(source);return source;}
  };
  const receipts=[];
  const r=new PlaybackReceipts((id,state)=>receipts.push([id,state]));
  const player=new PCMPlayer(ctx,{clock});
  const chunk=Buffer.alloc(960).toString('base64');
  r.stream('r');player.enqueue(chunk,r.scheduleChunk('r'));r.finish('r');
  assert.deepEqual(receipts,[]);
  ctx.currentTime=.012;tick();
  assert.deepEqual(receipts,[]);
  ctx.state='suspended';ctx.currentTime=.025;tick();
  assert.deepEqual(receipts,[]);
  ctx.state='running';tick();
  assert.deepEqual(receipts,[['r','started']]);
  nodes[0].onended();
  assert.deepEqual(receipts.at(-1),['r','completed']);
  r.stream('old');player.enqueue(chunk,r.scheduleChunk('old'));r.finish('old');
  const staleTimer=[...timers.values()][0],staleEnded=nodes[1].onended;
  r.interrupt();player.clear();
  const count=receipts.length;
  ctx.currentTime=3;staleTimer();staleEnded();
  assert.equal(receipts.length,count);
  assert.equal(timers.size,0);
});
