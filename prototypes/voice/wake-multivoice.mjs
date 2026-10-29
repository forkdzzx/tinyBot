// Additional synthetic coverage. No microphone or provider calls. Temporary
// macOS-generated WAV files are deleted; only text/counts go into the report.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {nativeEnv} from './wake-channel.mjs';
import {LocalSpotter} from './wake-core.mjs';
import {EnglishSpotter} from './wake-english.mjs';
import {PrefixAwareSpotter} from './wake-prefix.mjs';
import {WAKE_PHRASES} from '../expression/state.mjs';
if(!process.argv.includes('--native')){
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--native'],{env:nativeEnv(),stdio:'inherit'});
  child.on('error',()=>{console.error('Native probe launch failed');process.exitCode=1;});
  child.on('exit',code=>{process.exitCode=code??1;});
}else{
  const dir=mkdtempSync(fileURLToPath(new URL('../../runtime/wake-synthetic-',import.meta.url)));
  const report={at:new Date().toISOString(),synthetic:true,source:'macOS say',leadingSilenceMs:1000,results:[]};
  try{
    const profiles=[
      {id:'baseline',settings:{}},
      {id:'english',engine:EnglishSpotter,settings:{}},
      {id:'english-prefix1200',engine:PrefixAwareSpotter,settings:{}},
      {id:'english-prefix1200-short.35',engine:PrefixAwareSpotter,settings:{shortThreshold:.35}},
    ].map(p=>({...p,model:new (p.engine||LocalSpotter)(p.settings)}));
    for(const voice of ['Samantha','Daniel','Karen'])for(const rate of [170,220]){
      const cases=[...WAKE_PHRASES.map(text=>({text,expected:text})),...(rate===170?['Good morning.','What is your name?','The service is ready.','A jellyfish lives in the sea.','Harvest time is coming.','Hey Travis.','Harvey, are you there?','Wake up.','Daddy is home.','Hi.','Jar of jam.','Please help me with Java.','I need more coffee.','Can you repeat that?','The match starts tonight.']:[]).map(text=>({text,expected:null}))];
      for(const {text,expected} of cases){
        const path=dir+'/speech.wav';
        execFileSync('/usr/bin/say',['-v',voice,'-r',String(rate),'--file-format=WAVE','--data-format=LEI16@16000','-o',path,text],{timeout:15000,stdio:'ignore'});
        const wav=readFileSync(path);let pcm;
        for(let offset=12;offset+8<=wav.length;){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data')pcm=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
        if(!pcm?.length)throw new Error(`Empty synthesis: ${voice}`);
        pcm=Buffer.concat([Buffer.alloc(32000),pcm]);
        for(const {id,model} of profiles){
          model.reset();let detected=null;
          for(let offset=0;offset<pcm.length+64000;offset+=640){
            const frame=Buffer.alloc(640);if(offset<pcm.length)pcm.copy(frame,0,offset,Math.min(offset+640,pcm.length));
            const hit=model.accept(frame);if(hit){detected=WAKE_PHRASES[hit.index];break;}
          }
          const result={profile:id,voice,rate,text,expected,detected,pass:expected===detected};report.results.push(result);
        }
        console.log(JSON.stringify({voice,rate,text,results:report.results.slice(-profiles.length).map(r=>({profile:r.profile,detected:r.detected}))}));
      }
    }
  }catch(error){report.error=error.message;process.exitCode=1;}
  finally{rmSync(dir,{recursive:true,force:true});writeFileSync(new URL('../../runtime/wake-multivoice.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
}
