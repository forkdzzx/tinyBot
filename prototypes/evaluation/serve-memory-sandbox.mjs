import {mkdirSync,mkdtempSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {loadConfig} from '../voice/config.mjs';
import {createVoiceServer} from '../voice/server.mjs';

// Each launch owns a fresh data directory; restarting a chat within this server
// retains its test memories. It never opens the user's runtime/data directory.
const parent=fileURLToPath(new URL('../../runtime/evals/',import.meta.url));
mkdirSync(parent,{recursive:true,mode:0o700});
const memoryRoot=mkdtempSync(join(parent,'memory-manual-'));
const app=createVoiceServer({config:loadConfig(),port:8767,memoryRoot,withWake:false,memorySandbox:true});
app.start().then(origin=>console.log(`隔离记忆测试：${origin}\n测试数据：${memoryRoot}\n不会改动 runtime/data；每次启动服务使用新的测试数据。`)).catch(()=>{console.error('隔离测试未启动，请检查 8767 端口或本地数据目录。');process.exitCode=1;});
const shutdown=()=>{app.close();setTimeout(()=>process.exit(),3000).unref();};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
