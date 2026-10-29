import test from 'node:test';
import assert from 'node:assert/strict';
import {WakeGrants,nativeEnv} from '../prototypes/voice/wake-channel.mjs';
import {WakeInputStats} from '../prototypes/voice/wake-stats.mjs';
import {keywordLines,EXPERIMENTAL_WAKE_INDEXES} from '../prototypes/voice/wake-core.mjs';
test('cloud wake grants are single use, short lived and revoked on standby reset',()=>{
  let now=0;const grants=new WakeGrants(()=>now);
  assert.equal(grants.consume(undefined),false);
  const token=grants.issue();assert.equal(grants.consume('invented'),false);
  assert.equal(grants.consume(token),true);assert.equal(grants.consume(token),false);
  const expired=grants.issue();now=15000;assert.equal(grants.consume(expired),false);
  const revoked=grants.issue();grants.clear();assert.equal(grants.consume(revoked),false);
});
test('local recognizer receives no inherited provider credentials',()=>{
  const env=nativeEnv();assert.deepEqual(Object.keys(env).filter(k=>!['PATH','DYLD_LIBRARY_PATH','LD_LIBRARY_PATH'].includes(k)),[]);
});
test('wake diagnostics distinguish missing, silent and audible input without retaining PCM',()=>{
  const s=new WakeInputStats();assert.deepEqual(s.take(),{frames:0,audioMs:0,rms:0,peak:0,clippedSamples:0,audibleFrames:0});
  s.add(Buffer.alloc(640));assert.equal(s.take().frames,1);
  const frame=Buffer.alloc(640);for(let i=0;i<640;i+=2)frame.writeInt16LE(16384,i);
  s.add(frame);const result=s.take();assert.equal(result.rms,.5);assert.equal(result.peak,.5);assert.equal(result.audibleFrames,1);
  frame.fill(0);assert.equal(result.rms,.5);assert.equal(s.take().frames,0);
  assert.deepEqual(Object.keys(result).sort(),['audibleFrames','audioMs','clippedSamples','frames','peak','rms']);
});
test('wake diagnostics report clipping and reset each aggregation window',()=>{
  const s=new WakeInputStats(),frame=Buffer.alloc(640);frame.writeInt16LE(-32768,0);s.add(frame);
  const result=s.take();assert.equal(result.clippedSamples,1);assert.equal(result.peak,1);assert.equal(s.take().peak,0);
});
test('experimental pronunciations preserve all five phrase identities and the original paths',()=>{
  const dictionary=["HI -1 HH AY1","JARVIS -1 JH AA1 R V AH0 S","YOU -1 Y UW1","UP -1 AH1 P","ARE -1 AA1 R","THERE -1 DH EH1 R","WAKE -1 W EY1 K","DADDY'S -1 D AE1 D IY0 Z","HOME -1 HH OW1 M"].join('\n');
  const phones=[...new Set(dictionary.split('\n').flatMap(line=>line.split(' ').slice(2)).concat(['IH0','ER0']))];
  const tokens=phones.map((p,i)=>`${p} ${i}`).join('\n');
  const original=keywordLines(dictionary,tokens).trim().split('\n');
  const expanded=keywordLines(dictionary,tokens,{pronunciations:'nonrhotic'}).trim().split('\n');
  assert.equal(original.length,5);
  for(const line of original)assert.ok(expanded.includes(line));
  assert.deepEqual([...new Set(expanded.map(line=>line.split('@')[1]))].sort(),['W1','W2','W3','W4','W5']);
  assert.ok(expanded.some(line=>line.includes('IH0')));assert.ok(expanded.some(line=>line.includes('ER0')));
  assert.throws(()=>keywordLines(dictionary,tokens.replace(/^IH0 .*\n?/m,''),{pronunciations:'cmu'}),/Unknown keyword token/);
});
test('V1 experimental keyword selection compiles only Hi Jarvis and preserves its label',()=>{
  const dictionary='HI -1 HH AY1\nJARVIS -1 JH AA1 R V AH0 S';
  const tokens='HH 0\nAY1 1\nJH 2\nAA1 3\nR 4\nV 5\nAH0 6\nS 7';
  assert.equal(keywordLines(dictionary,tokens,{phraseIndexes:EXPERIMENTAL_WAKE_INDEXES}),'HH AY1 JH AA1 R V AH0 S @W1\n');
  for(const phraseIndexes of [[],[0,0],[5],[-1],[0.5]])assert.throws(()=>keywordLines(dictionary,tokens,{phraseIndexes}),/Invalid wake phrase selection/);
});
