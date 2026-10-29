async (page) => {
  // Real browser audio objects, silent fake capture and deterministic fake sockets.
  // Provider/native-worker integration is tested separately by wake-integration.mjs.
  await page.addInitScript(() => {
    window.__checks={sockets:[],frames:0};
    navigator.mediaDevices.getUserMedia=async()=>{
      const context=new AudioContext({sampleRate:16000}),dest=context.createMediaStreamDestination();
      const source=context.createOscillator(),gain=context.createGain();gain.gain.value=0;
      source.connect(gain).connect(dest);source.start();
      window.__testMic={context,stream:dest.stream};return dest.stream;
    };
    class Socket {
      static OPEN=1;static CLOSED=3;
      constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;window.__checks.sockets.push(this);
        queueMicrotask(()=>{this.readyState=1;this.onopen?.();if(url.endsWith('/wake'))this.emit({type:'wake.ready'});});}
      emit(e){this.onmessage?.({data:JSON.stringify(e)});}
      send(raw){
        if(typeof raw!=='string'){window.__checks.frames++;return;}
        const e=JSON.parse(raw);
        if(e.type==='listen')queueMicrotask(()=>this.emit({type:'wake.listening'}));
        if(e.type==='start')queueMicrotask(()=>this.emit({type:'local.ready'}));
        if(e.type==='stop')queueMicrotask(()=>this.close());
      }
      close(){if(this.readyState===3)return;this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    }
    window.WebSocket=Socket;
    window.__emit=(path,e)=>window.__checks.sockets.filter(s=>s.url.endsWith(path)).at(-1).emit(e);
  });
  await page.clock.install();
  await page.goto('http://127.0.0.1:8766/');
  await page.getByRole('button',{name:'启用本地唤醒',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('本地待机'));
  const standby=await page.evaluate(()=>window.__checks.sockets.map(s=>s.url));
  if(standby.some(url=>url.endsWith('/voice')))throw new Error('Standby created a voice socket');
  const emit=(path,e)=>page.evaluate(([p,e])=>window.__emit(p,e),[path,e]);
  await emit('/wake',{type:'wake.detected',phrase:'Hi Jarvis',ticket:'test-only'});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('会话中'));
  await emit('/voice',{type:'local.waiting'});
  await page.clock.fastForward(500000);
  if(!(await page.locator('#status').textContent()).includes('安静等待'))throw new Error('Waiting ended before 10 minutes');
  await emit('/voice',{type:'local.user_started'});
  await emit('/voice',{type:'conversation.item.input_audio_transcription.completed',text:'你好'});
  await emit('/voice',{type:'response.output_audio.delta',delta:'A'.repeat(12800)});
  if(await page.locator('#face').getAttribute('data-state')!=='speaking')throw new Error('Audio remains blocked after waiting');
  await emit('/voice',{type:'response.output_audio.done'});
  // Browser AudioContext runs on its own real-time clock, so wait for actual queued audio.
  await page.clock.runFor(600);
  await page.clock.fastForward(118000);
  if((await page.locator('#status').textContent()).includes('本地待机'))throw new Error('Idle ended before playback + 2 minutes');
  await page.clock.fastForward(3000);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('本地待机'));
  await emit('/wake',{type:'wake.detected',phrase:'Jarvis!',ticket:'test-only-2'});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('会话中'));
  await emit('/voice',{type:'local.waiting'});
  await page.clock.fastForward(600000);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('本地待机'));
  await page.getByRole('button',{name:'关闭交互',exact:true}).click();
  const tracks=await page.evaluate(()=>window.__testMic.stream.getTracks().map(t=>t.readyState));
  if(tracks.some(s=>s!=='ended'))throw new Error('Microphone track leaked');
  return {standbyDoesNotConnectCloud:true,waitingResumesAudio:true,playbackBasedIdle:true,tenMinuteWaitExpires:true,tracks,status:await page.locator('#status').textContent()};
}
