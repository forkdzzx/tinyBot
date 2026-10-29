async (page) => {
  await page.addInitScript(()=>{
    window.__sockets=[];
    navigator.mediaDevices.getUserMedia=async()=>{
      const ctx=new AudioContext({sampleRate:16000}),dest=ctx.createMediaStreamDestination();
      const osc=ctx.createOscillator(),gain=ctx.createGain();gain.gain.value=0;osc.connect(gain).connect(dest);osc.start();
      window.__mic=dest.stream;return dest.stream;
    };
    class Socket {
      static OPEN=1;
      constructor(url){this.url=url;this.bufferedAmount=0;window.__sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.onopen?.();this.emit({type:'wake.ready'});});}
      emit(e){this.onmessage?.({data:JSON.stringify(e)});}
      send(raw){if(typeof raw==='string'&&JSON.parse(raw).type==='listen')queueMicrotask(()=>this.emit({type:'wake.listening'}));}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    }
    window.WebSocket=Socket;
  });
  await page.goto('http://127.0.0.1:8766/');
  await page.getByText('实验与诊断',{exact:true}).click();
  await page.getByRole('button',{name:'只测 Hi Jarvis（不连云端）',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('仅测试 Hi Jarvis'));
  for(const phrase of ['Hi Jarvis','Hi Jarvis','Hi Jarvis']){
    await page.evaluate(phrase=>window.__sockets[0].emit({type:'wake.detected',phrase,ticket:'test'}),phrase);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('仅测试 Hi Jarvis'));
  }
  await page.evaluate(()=>window.__sockets[0].emit({type:'wake.activity',frames:100,peak:.2,audibleFrames:30,pending:1}));
  const result={status:await page.locator('#status').textContent(),input:await page.locator('#wake-input').textContent(),urls:await page.evaluate(()=>window.__sockets.map(s=>s.url)),events:await page.locator('#events').textContent()};
  if(result.urls.some(u=>u.endsWith('/voice')))throw new Error('wake-only test opened cloud route');
  if(!result.input.includes('收到声音'))throw new Error('Input health is not visible');
  await page.getByRole('button',{name:'关闭交互',exact:true}).click();
  result.tracks=await page.evaluate(()=>window.__mic.getTracks().map(t=>t.readyState));
  if(result.tracks.some(s=>s!=='ended'))throw new Error('Input track not stopped');
  return result;
}
