import test from 'node:test';
import assert from 'node:assert/strict';
import {TurnTiming,timingDiagnostic} from '../prototypes/voice/timing.mjs';
test('timing separates an energy proxy, ASR completion and first scheduled audio',()=>{
  const t=new TurnTiming();t.sample(.1,20);t.sample(.1,40);t.sample(.1,60);t.userStarted(80);t.sample(.1,100);
  assert.equal(t.inputCompleted(1500).lastEnergyToAsrMs,1400);
  const first=t.firstAudio(1900);assert.equal(first.asrToFirstAudioMs,400);assert.equal(first.lastEnergyToFirstAudioMs,1800);
  assert.equal(t.firstAudio(2000),null);t.userStarted(3000);assert.equal(t.inputCompleted(4000).lastEnergyToAsrMs,null);
});
test('brief spikes and playback energy do not establish a speech endpoint; state resets between sessions',()=>{
  const t=new TurnTiming();t.sample(.5,10);t.sample(0,30);for(let i=0;i<10;i++)t.sample(.5,50+i*20,true);
  t.userStarted(300);assert.equal(t.inputCompleted(1000).lastEnergyToAsrMs,null);t.reset();assert.equal(t.firstAudio(2000),null);assert.equal(t.inputCompleted(3000),null);
});
test('diagnostics accept bounded structural fields and discard arbitrary text or audio',()=>{
  const out=timingDiagnostic({stage:'asr_final',turn:1,asrWindowMs:2000000,lastEnergyToAsrMs:-1,contextState:'secret',audio:'do not retain',text:'do not retain'});
  assert.equal(out.asrWindowMs,600000);assert.equal(out.lastEnergyToAsrMs,null);assert.equal(out.contextState,'unknown');assert.equal(out.audio,undefined);assert.equal(out.text,undefined);
  assert.equal(timingDiagnostic({stage:'other',turn:1}),null);assert.equal(timingDiagnostic({stage:'asr_final',turn:-1}),null);
});
