import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {WAKE_PHRASES} from '../expression/state.mjs';
import {MODEL_DIR} from './wake-model.mjs';
// The product exposes only Hi Jarvis as an optional experiment. Offline probes
// retain the historical full list by leaving phraseIndexes unspecified.
export const EXPERIMENTAL_WAKE_INDEXES=Object.freeze([0]);
export function keywordLines(dictionary,tokens,{pronunciations='original',phraseIndexes=WAKE_PHRASES.map((_,i)=>i)}={}){
  if(!phraseIndexes.length||new Set(phraseIndexes).size!==phraseIndexes.length||phraseIndexes.some(i=>!Number.isInteger(i)||!WAKE_PHRASES[i]))throw new Error('Invalid wake phrase selection');
  const lexicon=new Map(dictionary.trim().split('\n').map(line=>{
    const [word,_score,...phones]=line.trim().split(/\s+/);return [word,phones];
  }));
  const valid=new Set(tokens.trim().split('\n').map(line=>line.split(/\s+/)[0]));
  return WAKE_PHRASES.flatMap((phrase,index)=>{
    if(!phraseIndexes.includes(index))return [];
    const words=phrase.toUpperCase().replaceAll('’',"'").replace(/[.,!?]/g,'').split(/\s+/);
    let paths=[[]];
    for(const word of words){
      const original=lexicon.get(word);if(!original?.length)throw new Error('Missing keyword pronunciation');
      const choices=[original];
      // CMUdict lists alternate pronunciations for JARVIS and ARE.
      // https://github.com/cmusphinx/cmudict/blob/master/cmudict.dict
      if(pronunciations!=='original'&&word==='JARVIS')choices.push('JH AA1 R V IH0 S'.split(' '));
      if(pronunciations!=='original'&&word==='ARE')choices.push(['ER0']);
      // Experimental non-rhotic variants, evaluated separately, not a default.
      if(pronunciations==='nonrhotic'&&word==='JARVIS')choices.push('JH AA1 V AH0 S'.split(' '),'JH AA1 V IH0 S'.split(' '));
      paths=paths.flatMap(prefix=>choices.map(phones=>[...prefix,...phones]));
    }
    if(paths.flat().some(p=>!valid.has(p)))throw new Error('Unknown keyword token');
    return [...new Set(paths.map(phones=>`${phones.join(' ')} @W${index+1}`))];
  }).join('\n')+'\n';
}
export class KeywordStream {
  constructor(spotter){this.spotter=spotter;this.reset();}
  reset(){this.stream=this.spotter.createStream();}
  accept(pcm){
    const samples=new Float32Array(pcm.length/2);
    for(let i=0;i<samples.length;i++)samples[i]=pcm.readInt16LE(i*2)/32768;
    this.stream.acceptWaveform({samples,sampleRate:16000});
    while(this.spotter.isReady(this.stream)){
      this.spotter.decode(this.stream);
      const result=this.spotter.getResult(this.stream);
      if(result.keyword){this.spotter.reset(this.stream);return {...result,index:Number(result.keyword.slice(1))-1};}
    }
    return null;
  }
}
export class LocalSpotter extends KeywordStream {
  constructor({keywordsScore=1,keywordsThreshold=.25,numTrailingBlanks=8,pronunciations='original',phraseIndexes}={}){
    const lines=keywordLines(readFileSync(join(MODEL_DIR,'g2p.dict'),'utf8'),readFileSync(join(MODEL_DIR,'tokens.txt'),'utf8'),{pronunciations,phraseIndexes});
    const keywords=join(MODEL_DIR,`jarvis-keywords-${createHash('sha256').update(lines).digest('hex').slice(0,12)}.txt`);
    writeFileSync(keywords,lines);
    const sherpa=createRequire(import.meta.url)('sherpa-onnx-node');
    super(new sherpa.KeywordSpotter({
      featConfig:{sampleRate:16000,featureDim:80},
      modelConfig:{transducer:{encoder:join(MODEL_DIR,'encoder-epoch-13-avg-2-chunk-16-left-64.int8.onnx'),
        decoder:join(MODEL_DIR,'decoder-epoch-13-avg-2-chunk-16-left-64.onnx'),
        joiner:join(MODEL_DIR,'joiner-epoch-13-avg-2-chunk-16-left-64.int8.onnx')},
        tokens:join(MODEL_DIR,'tokens.txt'),numThreads:2,provider:'cpu'},
      keywordsFile:keywords,keywordsScore,keywordsThreshold,maxActivePaths:4,numTrailingBlanks,
    }));
  }
}
