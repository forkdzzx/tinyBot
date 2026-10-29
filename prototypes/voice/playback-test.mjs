import { PCMPlayer } from './playback.mjs';
document.getElementById('run').onclick=async()=>{
  const result=document.getElementById('result'),button=document.getElementById('run');button.disabled=true;
  let context,player;
  try{
    context=new AudioContext({sampleRate:24000});await context.resume();player=new PCMPlayer(context);
    const frame=btoa('\0'.repeat(48000));
    for(let i=0;i<45;i++)player.enqueue(frame);
    if(player.queuedSeconds<40)throw new Error('长回答未正确排程');
    const queued=player.queuedSeconds.toFixed(2);
    player.clear();
    if(player.active||player.bufferBytes)throw new Error('打断未清空');
    player.enqueue(frame);
    if(player.queuedSeconds>1.1)throw new Error('新回答被旧音频阻塞');
    result.textContent=`45 秒排程通过（待播 ${queued} 秒）；清空和新回复排程通过，等待自然播放结束…`;
    await new Promise(resolve=>setTimeout(resolve,1500));
    if(player.active||player.bufferBytes)throw new Error('播放结束后缓存未释放');
    result.textContent=`PASS：45 秒音频排程（待播 ${queued} 秒）、打断清空、新回复立即排程、播放结束释放缓存。`;
  }catch(error){result.textContent=`FAIL：${error.message}`;}
  finally{player?.clear();await context?.close();button.disabled=false;}
};
