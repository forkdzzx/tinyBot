async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__sockets=[];window.__tracks=[];
    navigator.mediaDevices.getUserMedia=async()=>{
      const ctx=new AudioContext({sampleRate:16000}),dest=ctx.createMediaStreamDestination();
      const osc=ctx.createOscillator(),gain=ctx.createGain();gain.gain.value=0;osc.connect(gain).connect(dest);osc.start();
      window.__tracks.push(...dest.stream.getTracks());return dest.stream;
    };
    class Socket {
      static OPEN=1;
      constructor(url){this.url=url;this.sent=[];this.bufferedAmount=0;window.__sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.onopen?.();if(url.endsWith('/wake'))this.emit({type:'wake.ready'});});}
      emit(e){this.onmessage?.({data:JSON.stringify(e)});}
      send(raw){if(typeof raw!=='string')return;const e=JSON.parse(raw);this.sent.push(e);if(e.type==='start')queueMicrotask(()=>this.emit({type:'local.ready'}));if(e.type==='interrupt')queueMicrotask(()=>this.emit({type:'response.canceled'}));if(e.type==='stop')queueMicrotask(()=>this.emit({type:'local.closed'}));if(e.type==='listen')queueMicrotask(()=>this.emit({type:'wake.listening'}));}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    }
    window.WebSocket=Socket;
  });
  await page.goto('http://127.0.0.1:8766/');
  const start=page.getByRole('button',{name:'开始聊天',exact:true});
  if(!await start.isVisible())throw new Error('Primary start button hidden');
  if(await page.evaluate(()=>window.__sockets.length||window.__tracks.length))throw new Error('Auto connection or microphone access');
  for(let i=0;i<3;i++){
    await start.click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('可以直接讲话'));
    const result=await page.evaluate(()=>window.__sockets.map(s=>({url:s.url,start:s.sent.find(e=>e.type==='start')})));
    if(result.length!==i+1||result.some(s=>!s.url.endsWith('/voice')||s.start?.mode!=='manual'||s.start?.clientBuild!=='voice-web-20261030'))throw new Error('Unexpected wake channel or start mode');
    if(!await start.isDisabled())throw new Error('Duplicate start possible');
    if(i===0){
      await page.evaluate(()=>{
        const s=window.__sockets.at(-1);
        s.emit({type:'local.user_started'});
        s.emit({type:'conversation.item.input_audio_transcription.completed',text:'你好'});
        s.emit({type:'response.output_audio.started',response_id:'completed-response'});
        s.emit({type:'response.output_audio.delta',delta:btoa('\0'.repeat(9600))});
        s.emit({type:'response.output_audio.done',response_id:'completed-response'});
        if(s.sent.some(e=>e.type==='playback'&&e.state==='completed'))throw new Error('Cloud done falsely claimed playback complete');
      });
      await page.waitForFunction(()=>window.__sockets.at(-1).sent.some(e=>e.type==='playback'&&e.response_id==='completed-response'&&e.state==='completed'));
      await page.evaluate(()=>{
        const s=window.__sockets.at(-1);s.emit({type:'response.output_audio.started',response_id:'interrupted-response'});
        s.emit({type:'response.output_audio.delta',delta:btoa('\0'.repeat(96000))});
        s.emit({type:'response.output_audio.done',response_id:'interrupted-response'});
      });
      await page.getByRole('button',{name:'打断播报',exact:true}).click();
      const receipts=await page.evaluate(()=>window.__sockets.at(-1).sent.filter(e=>e.type==='playback'&&e.response_id==='interrupted-response'));
      if(!receipts.some(e=>e.state==='interrupted')||receipts.some(e=>e.state==='completed'))throw new Error('Interruption receipt wrong');
      await page.getByRole('button',{name:'结束聊天',exact:true}).click();
    }
    else await page.evaluate(text=>{const s=window.__sockets.at(-1);s.emit({type:'local.user_started'});s.emit({type:'conversation.item.input_audio_transcription.completed',text});},i===1?'哎，我有点不想聊天了，先结束吧。':'OK，可以结束了。');
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('麦克风关闭'));
    if(!await start.isEnabled())throw new Error('Cannot start again');
    if(await page.evaluate(()=>window.__tracks.some(t=>t.readyState!=='ended')||window.__sockets.some(s=>s.readyState!==3)))throw new Error('Session resources leaked');
  }
  await page.getByText('实验与诊断',{exact:true}).click();
  await page.getByRole('button',{name:'只测 Hi Jarvis（不连云端）',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('仅测试 Hi Jarvis'));
  await page.evaluate(()=>window.__sockets.at(-1).emit({type:'wake.detected',phrase:'Hi Jarvis',ticket:'test'}));
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('仅测试 Hi Jarvis'));
  await page.getByRole('button',{name:'关闭交互',exact:true}).click();
  if(await page.evaluate(()=>window.__tracks.some(t=>t.readyState!=='ended')))throw new Error('Experiment microphone left open');
  if(errors.length)throw new Error(errors.join('; '));
  const timings=await page.evaluate(()=>window.__sockets[0].sent.filter(e=>e.type==='timing'));
  if(timings.length!==2||timings[0].stage!=='asr_final'||timings[1].stage!=='first_audio_scheduled')throw new Error('Missing timing diagnostics');
  if(timings.some(e=>e.audio||e.text))throw new Error('Timing contains content');
  return {structuralTiming:true,playbackCompletionAfterActualEnd:true,interruptionReceipt:true,manualCycles:3,ends:['button','哎，我有点不想聊天了，先结束吧','OK，可以结束了'],noAutomaticCapture:true,noWakeRequired:true,experimentalWakeOnly:true,resourcesReleased:true,pageErrors:errors};
}
