// Node example. The caller supplies one atomic snapshot on each accepted event.
import { pathToFileURL } from 'node:url';
import './artwork.js';

const { defs, modes } = globalThis.JarvisEyeArtwork;
const phases = new Set(['idle', 'connecting', 'listening', 'thinking', 'searching',
  'speaking', 'waiting', 'sleepy', 'offline', 'off']);
const ownerKeys = ['sessionId', 'turnId', 'responseId', 'segmentId'];

function belongsToPlayback(tone, playback, nowMs) {
  return tone && playback && defs[tone.id]?.group === 1 &&
    Number.isFinite(tone.startedAtMs) && Number.isFinite(tone.expiresAtMs) &&
    tone.startedAtMs <= nowMs && nowMs < tone.expiresAtMs &&
    ownerKeys.every(key => playback[key] != null && playback[key] === tone[key]);
}

export function resolveFace(snapshot, nowMs) {
  const aliases = { drowsy: 'sleepy', disabled: 'off', closing: 'off' };
  const phase = aliases[snapshot.phase] ?? snapshot.phase;
  const mode = Object.hasOwn(modes, snapshot.mode) ? snapshot.mode : 'daily';
  if (phase === 'off') return { state: 'off', mode, status: '', caption: '', badges: [] };

  // The displayed fact, caption and eyes have distinct lifetimes.
  const known = phases.has(phase);
  let state = known ? phase : 'waiting';
  const status = known ? (defs[state].label || defs[state].name) : '等待状态同步';
  let caption = '';
  if (phase === 'speaking' && snapshot.playback) {
    caption = snapshot.playback.caption ?? '';
    if (belongsToPlayback(snapshot.tone, snapshot.playback, nowMs)) state = snapshot.tone.id;
  } else if (phase === 'listening') {
    caption = snapshot.inputText ?? '';
  } else if (phase === 'offline') {
    caption = snapshot.message ?? '连接中断';
  } else if (phase === 'idle' && snapshot.dnd) {
    state = 'dnd';
  }
  const badges = [];
  if (snapshot.dnd) badges.push('勿扰');
  if (snapshot.jointFault) badges.push('关节故障');
  return { state, mode, status, caption, badges };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const owner = { sessionId: 'demo', turnId: 3, responseId: 'answer-a', segmentId: 1 };
  const speaking = {
    phase: 'speaking', mode: 'english', dnd: true,
    playback: { ...owner, caption: 'You did it!' },
    tone: { ...owner, id: 'excited', startedAtMs: 100, expiresAtMs: 3700 },
  };
  const companion = { ...speaking, mode: 'companion' };
  const nextAnswer = { ...companion, playback: { ...owner, turnId: 4, responseId: 'answer-b', caption: 'We can pause.' } };
  const examples = [
    [100, speaking],
    [350, companion],
    [400, { ...companion, phase: 'listening', inputText: '等一下' }],
    [500, nextAnswer],
    [3800, { ...nextAnswer, phase: 'listening', inputText: '' }],
    [5000, { ...nextAnswer, phase: 'off' }],
  ];
  for (const [ms, snapshot] of examples) {
    console.log(JSON.stringify({ ms, ...resolveFace(snapshot, ms) }));
  }
}
