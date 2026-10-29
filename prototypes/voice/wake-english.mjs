// Experimental only. Production wake-worker.mjs still constructs LocalSpotter.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {KeywordStream} from './wake-core.mjs';
export class EnglishSpotter extends KeywordStream {
  constructor({keywordsScore=1,keywordsThreshold=.25,numTrailingBlanks=8,phraseIndexes=[0,1,2,3,4]}={}){
    const dir=new URL('../../runtime/models/kws-en-20240101/',import.meta.url);
    const path=name=>fileURLToPath(new URL(name,dir));
    const lines=readFileSync(path('jarvis-keywords.txt'),'utf8').trim().split('\n').filter(line=>phraseIndexes.includes(Number(line.match(/@W(\d+)$/)?.[1])-1)).join('\n')+'\n';
    if(lines.trim().split('\n').length!==phraseIndexes.length)throw new Error('Missing English keyword resource');
    const keywords=path(`keywords-${createHash('sha256').update(lines).digest('hex').slice(0,12)}.txt`);writeFileSync(keywords,lines);
    const sherpa=createRequire(import.meta.url)('sherpa-onnx-node');
    super(new sherpa.KeywordSpotter({featConfig:{sampleRate:16000,featureDim:80},
      modelConfig:{transducer:{encoder:path('encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx'),
        decoder:path('decoder-epoch-12-avg-2-chunk-16-left-64.onnx'),joiner:path('joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx')},
        tokens:path('tokens.txt'),numThreads:2,provider:'cpu'},
      keywordsFile:keywords,keywordsScore,keywordsThreshold,numTrailingBlanks,maxActivePaths:4,
    }));
  }
}
