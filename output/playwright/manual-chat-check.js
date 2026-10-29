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
      send(raw){if(typeof raw!=='string')return;const e=JSON.parse(raw);this.sent.push(e);if(e.type==='start')queueMicrotask(()=>this.emit({type:'local.ready'}));if(e.type==='stop')queueMicrotask(()=>this.emit({type:'local.closed'}));if(e.type==='listen')queueMicrotask(()=>this.emit({type:'wake.listening'}));}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    }
    window.WebSocket=Socket;
  });
  await page.goto('http://127.0.0.1:8766/');
  const start=page.getByRole('button',{name:'开始聊天',exact:true});
  if(!await start.isVisible())throw new Error('Primary start button hidden');
  if(await page.evaluate(()=>window.__sockets.length||window.__tracks.length))throw new Error('Auto connection or microphone access');
  for(let i=0;i<2;i++){
    await start.click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('可以直接讲话'));
    const result=await page.evaluate(()=>window.__sockets.map(s=>({url:s.url,start:s.sent.find(e=>e.type==='start')})));
    if(result.length!==i+1||result.some(s=>!s.url.endsWith('/voice')||s.start?.mode!=='manual'))throw new Error('Unexpected wake channel or start mode');
    if(!await start.isDisabled())throw new Error('Duplicate start possible');
    if(i===0)await page.getByRole('button',{name:'结束聊天',exact:true}).click();
    else await page.evaluate(()=>window.__sockets.at(-1).emit({type:'local.end'}));
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
  return {manualCycles:2,ends:['button','server end event'],noAutomaticCapture:true,noWakeRequired:true,experimentalWakeOnly:true,resourcesReleased:true,pageErrors:errors};
}
