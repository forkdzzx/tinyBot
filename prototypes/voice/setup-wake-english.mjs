// Experimental comparison resources only; does not change the production model.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {WAKE_PHRASES} from '../expression/state.mjs';
const manifest=JSON.parse(await readFile(new URL('./english-wake-model.json',import.meta.url)));
const dir=new URL('../../runtime/models/kws-en-20240101/',import.meta.url);
await mkdir(dir,{recursive:true});
const hash=data=>createHash('sha256').update(data).digest('hex');
for(const file of manifest.files){
  const target=new URL(file.name,dir);
  try{if(hash(await readFile(target))===file.sha256)continue;}catch{}
  const response=await fetch(`${manifest.source}/resolve/${file.revision}/${file.name}`,{signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(`Model download HTTP ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());if(hash(data)!==file.sha256)throw new Error('Model hash mismatch');
  await writeFile(new URL(file.name+'.part',dir),data);await rename(new URL(file.name+'.part',dir),target);console.log(`${file.name} verified`);
}
const python=fileURLToPath(new URL('../../runtime/wake-tools/bin/python',import.meta.url));
const script="import sys,json,re,sentencepiece as sp\ns=sp.SentencePieceProcessor(model_file=sys.argv[1])\nfor i,t in enumerate(json.load(sys.stdin)):\n t=re.sub(r'[.,!?]', '',t.replace(chr(8217),chr(39)).upper())\n print(' '.join(s.encode(t,out_type=str))+' @W'+str(i+1))";
const encoded=execFileSync(python,['-c',script,fileURLToPath(new URL('bpe.model',dir))],{input:JSON.stringify(WAKE_PHRASES),encoding:'utf8'});
const valid=new Set((await readFile(new URL('tokens.txt',dir),'utf8')).trim().split('\n').map(line=>line.split(/\s+/)[0]));
for(const line of encoded.trim().split('\n'))for(const t of line.split(' ').filter(t=>!t.startsWith('@')))if(!valid.has(t))throw new Error('Unknown BPE token');
await writeFile(new URL('jarvis-keywords.txt',dir),encoded);
console.log('Experimental English wake resources ready; production profile unchanged.');
