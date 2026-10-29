import test from 'node:test';
import assert from 'node:assert/strict';
import { PCMPlayer } from '../prototypes/voice/playback.mjs';

function context(){
  return {currentTime:0,destination:{},nodes:[],
    createBuffer(_channels,length,rate){return {duration:length/rate,getChannelData:()=>new Float32Array(length)};},
    createBufferSource(){const node={connect(){},disconnect(){this.disconnected=true;},start(at){this.at=at;},stop(){this.stopped=true;}};this.nodes.push(node);return node;},
  };
}
const pcm=seconds=>Buffer.alloc(seconds*48000).toString('base64');
test('faster-than-real-time 45-second response plays contiguously beyond former 20-second cap',()=>{
  const ctx=context(),player=new PCMPlayer(ctx);
  for(let i=0;i<45;i++){ctx.currentTime=i*.1;player.enqueue(pcm(1));}
  assert.ok(player.queuedSeconds>40);
  assert.equal(player.sources.size,45);
  for(let i=1;i<ctx.nodes.length;i++)assert.equal(ctx.nodes[i].at,ctx.nodes[i-1].at+1);
  for(const source of ctx.nodes)source.onended();
  assert.equal(player.bufferBytes,0);assert.equal(player.active,false);
});
test('interrupt clears every scheduled chunk and a new answer starts immediately',()=>{
  const ctx=context(),player=new PCMPlayer(ctx);
  player.enqueue(pcm(30));const old=ctx.nodes[0];const lateEnded=old.onended;
  ctx.currentTime=2;player.clear();
  assert.equal(old.stopped,true);assert.equal(player.bufferBytes,0);
  player.enqueue(pcm(1));lateEnded();
  assert.equal(ctx.nodes[1].at,2.025);assert.equal(player.bufferBytes,96000);
});
test('memory protection has a specific error and releases space on playback completion',()=>{
  const ctx=context(),player=new PCMPlayer(ctx,{maxBytes:96000});
  player.enqueue(pcm(1));
  assert.throws(()=>player.enqueue(pcm(1)),{code:'PLAYBACK_MEMORY_LIMIT'});
  ctx.nodes[0].onended();player.enqueue(pcm(1));
  assert.equal(player.bufferBytes,96000);
});
test('malformed PCM is distinguishable from a long valid reply',()=>{
  const player=new PCMPlayer(context());
  assert.throws(()=>player.enqueue('AA=='),{code:'MALFORMED_PCM'});
  assert.throws(()=>player.enqueue('%'),{code:'INVALID_AUDIO_BASE64'});
  assert.equal(player.bufferBytes,0);
});
