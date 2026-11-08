// playwright-cli run-code --filename output/playwright/voice-face-check.js
async (page) => {
  const errors = [], reports = [];
  let local;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext({ sampleRate: 16000 });
      const destination = context.createMediaStreamDestination();
      window.testTracks = destination.stream.getTracks();
      return destination.stream;
    };
  });
  await page.routeWebSocket('**/voice', route => {
    local = route;
    route.onMessage(raw => {
      const e = JSON.parse(String(raw));
      if (e.type === 'start') route.send(JSON.stringify({ type: 'local.ready' }));
      if (e.type === 'interrupt') route.send(JSON.stringify({ type: 'response.canceled' }));
      if (e.type === 'stop') route.send(JSON.stringify({ type: 'local.closed' }));
      if (e.type === 'playback' || e.type === 'face_state') reports.push(e);
    });
  });
  await page.goto('http://127.0.0.1:8767/');
  const send = message => local.send(JSON.stringify(message));
  const face = page.locator('#face');
  async function state(value) {
    await page.locator('#face[data-state="' + value + '"]').waitFor({ timeout: 4000 });
  }
  const caption = () => page.locator('#face-caption').textContent();
  const check = (value, message) => { if (!value) throw new Error(message); };
  await page.locator('#eye-art path').first().waitFor({ state: 'attached' });
  await page.getByRole('button', { name: '开始聊天', exact: true }).click();
  await state('listening');
  send({ type: 'local.user_started' });
  send({ type: 'conversation.item.input_audio_transcription.completed', text: '讲讲行星' });
  await state('thinking');
  send({ type: 'response.output_text.done', response_id: 'old', text: '这是第一段播报。' });
  send({ type: 'response.output_audio.started', response_id: 'old' });
  await page.waitForFunction(() => document.querySelector('#assistant').textContent.includes('第一段'));
  check((await face.getAttribute('data-state')) === 'thinking', 'spoke before playback');
  check((await caption()) !== '这是第一段播报。', 'answer caption before playback');
  const silence = await page.evaluate(() => btoa('\0'.repeat(96000)));
  send({ type: 'response.output_audio.delta', delta: silence });
  await state('speaking');
  check(await caption() === '这是第一段播报。', 'missing current caption');
  send({ type: 'local.mode_state', id: 'work', name: '工作' });
  await page.locator('#face[data-mode="work"]').waitFor();
  send({ type: 'local.mode_state', id: 'daily', name: '日常', autoLocked: true });
  await page.locator('#face[data-mode="daily"]').waitFor();
  await page.getByRole('button', { name: '打断播报', exact: true }).click();
  await state('listening');
  check(await caption() === '', 'old caption after barge-in');
  send({ type: 'local.user_started' });
  send({ type: 'conversation.item.input_audio_transcription.completed', text: '一加一呢' });
  await state('thinking');
  send({ type: 'response.output_text.done', response_id: 'new', text: '二。' });
  send({ type: 'response.output_audio.started', response_id: 'new' });
  send({ type: 'response.output_audio.delta', response_id: 'new', delta: silence });
  await state('speaking');
  send({ type: 'response.output_audio.done', response_id: 'old' });
  check(await caption() === '二。', 'old callback changed the current caption');
  send({ type: 'response.output_audio.done', response_id: 'new' });
  await state('listening');
  check(await caption() === '', 'caption survived playback drain');
  await page.getByRole('button', { name: '结束聊天', exact: true }).click();
  await page.waitForFunction(() => window.testTracks.every(track => track.readyState === 'ended'));
  await state('idle');
  const receipts = reports.filter(e => e.type === 'playback').map(e => e.response_id + '/' + e.state);
  check(receipts.join(',') === 'old/started,old/interrupted,new/started,new/completed', 'unexpected receipts: ' + receipts);
  check(!errors.length, 'page errors: ' + errors.join(', '));
  return { environment: 'Chrome, actual Web Audio clock, synthetic track, stubbed /voice', receipts,
    render: 'UED SVG', checks: ['deferred speaking', 'caption ownership', 'mode rollback', 'barge-in', 'late completion', 'track release'] };
}
