// Only the preview and its two portable drawing scripts are exposed.
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const html = new URL('./index.html', import.meta.url);
const resources = new Map([
  ['/', [html, 'text/html']],
  ['/index.html', [html, 'text/html']],
  ...['artwork', 'transitions'].map(name => {
    const path = '/design/eyes/' + name + '.js';
    return [path, [new URL('../..' + path, import.meta.url), 'text/javascript']];
  }),
]);
const server = http.createServer(async (req, res) => {
  const resource = resources.get(req.url);
  if (req.method !== 'GET' || !resource) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const [file, mime] = resource;
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime + '; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    }).end(body);
  } catch {
    res.writeHead(500).end('Cannot load design preview');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(8768, '127.0.0.1', () => console.log('Jarvis eye design: http://127.0.0.1:8768/'));
