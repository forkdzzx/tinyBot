// Experimental offline candidate; not selected by wake-worker.mjs.
import {EnglishSpotter} from './wake-english.mjs';
import {WakeChoice} from './wake-choice.mjs';
export class PrefixAwareSpotter {
  constructor({holdMs=1200,shortThreshold=.25}={}){
    this.full=new EnglishSpotter({phraseIndexes:[0,1,2,3]});
    this.short=new EnglishSpotter({phraseIndexes:[4],keywordsThreshold:shortThreshold});
    this.choice=new WakeChoice(holdMs);
  }
  reset(){this.full.reset();this.short.reset();this.choice.reset();}
  accept(pcm){return this.choice.accept(pcm.length/2,this.full.accept(pcm),this.short.accept(pcm));}
}
