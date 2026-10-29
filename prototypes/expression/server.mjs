import http from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/state.mjs', ['state.mjs', 'text/javascript; charset=utf-8']],
]);
const server = http.createServer(async (req, res) => {
  const asset = assets.get(req.url);
  if (req.method !== 'GET' || !asset) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL(asset[0], import.meta.url));
    res.writeHead(200, {
      'Content-Type': asset[1], 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-ancestors 'none'",
    }).end(data);
  } catch {
    res.writeHead(500).end('Cannot load prototype asset');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(8765, '127.0.0.1', () => console.log('Jarvis expression prototype: http://127.0.0.1:8765'));
