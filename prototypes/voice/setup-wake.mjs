import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {createHash} from 'node:crypto';
import {MODEL_DIR,MODEL_SOURCE,MODEL_REVISION,MODEL_FILES} from './wake-model.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
await mkdir(MODEL_DIR,{recursive:true});
for(const [path,expected] of MODEL_FILES){
  const target=join(MODEL_DIR,basename(path));
  try{if(hash(await readFile(target))===expected){console.log(`${basename(path)} verified`);continue;}}catch{}
  const url=`${MODEL_SOURCE}/resolve/${MODEL_REVISION}/${path}`;
  const res=await fetch(url,{signal:AbortSignal.timeout(180000)});
  if(!res.ok)throw new Error(`Model download HTTP ${res.status}`);
  const bytes=Buffer.from(await res.arrayBuffer());
  if(hash(bytes)!==expected)throw new Error(`Model checksum mismatch: ${basename(path)}`);
  await writeFile(target+'.part',bytes);await rename(target+'.part',target);
  console.log(`${basename(path)} downloaded and verified (${bytes.length} bytes)`);
}
console.log('Local wake model ready; no microphone or cloud speech session was opened.');
