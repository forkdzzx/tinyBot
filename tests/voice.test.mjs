import test from 'node:test';
import assert from 'node:assert/strict';
import { ResponseGuard } from '../prototypes/voice/guard.mjs';
import { sessionCreate, ACTIVE_PROMPT_ID } from '../prototypes/voice/config.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('base voice request retains the frozen v3 candidate; memory adapter is tested separately',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../eval/voice-v3/baseline.json',import.meta.url),'utf8'));
  assert.equal(ACTIVE_PROMPT_ID,baseline.id);
  assert.equal(createHash('sha256').update(baseline.request.session.instructions).digest('hex'),baseline.promptSha256);
  assert.deepEqual(sessionCreate(baseline.request.session.audio.output.voice),baseline.request);
});
test('interruption drops cancelled response audio even after cancel ack',()=>{
  const g=new ResponseGuard();
  assert.equal(g.accept({type:'response.output_audio.started',response_id:'old'}),true);
  g.interrupt();
  assert.equal(g.accept({type:'response.output_audio.delta',response_id:'old'}),false);
  assert.equal(g.accept({type:'response.canceled'}),true);
  assert.equal(g.accept({type:'response.output_text.delta',response_id:'old'}),false);
  assert.equal(g.accept({type:'response.output_audio.started',response_id:'new'}),true);
  assert.equal(g.accept({type:'response.output_audio.delta',response_id:'new'}),true);
});
test('an unseen response that arrives during cancellation remains invalid',()=>{
  const g=new ResponseGuard();g.interrupt();
  assert.equal(g.accept({type:'response.output_audio.started',response_id:'late'}),false);
  g.accept({type:'response.canceled'});
  assert.equal(g.accept({type:'response.output_audio.delta',response_id:'late'}),false);
});
test('session starts fresh with explicit PCM formats and no credential in payload',()=>{
  const e=sessionCreate('test-voice');
  assert.equal(e.session.id,undefined);
  assert.equal(e.session.audio.input.format.rate,16000);
  assert.equal(e.session.audio.output.format.type,'pcm_s16le');
  assert.equal(JSON.stringify(e).includes('API_KEY'),false);
});
test('Seeduplex audio chunks without IDs remain blocked until a fresh audio stream',()=>{
  const g=new ResponseGuard();
  g.accept({type:'response.output_audio.started',response_id:'old'});
  assert.equal(g.accept({type:'response.output_audio.delta',delta:'pcm'}),true);
  g.interrupt();g.accept({type:'response.canceled'});
  assert.equal(g.accept({type:'response.output_audio.delta',delta:'late pcm'}),false);
  g.accept({type:'response.output_audio.started',response_id:'new'});
  assert.equal(g.accept({type:'response.output_audio.delta',delta:'fresh pcm'}),true);
});
test('completed generation does not cancel the next user turn',()=>{
  const g=new ResponseGuard();g.accept({type:'response.output_audio.started',response_id:'old'});
  g.accept({type:'response.done'});
  assert.equal(g.active,null);
});
test('late completion of cancelled audio cannot end playback or clear a newer response',()=>{
  const g=new ResponseGuard();g.accept({type:'response.output_audio.started',response_id:'old'});
  g.interrupt();g.accept({type:'response.canceled'});
  assert.equal(g.accept({type:'response.output_audio.done'}),false);
  g.accept({type:'response.output_audio.started',response_id:'new'});
  assert.equal(g.accept({type:'response.done',response:{id:'old'}}),false);
  assert.equal(g.active,'new');
});
