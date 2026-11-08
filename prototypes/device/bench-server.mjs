import { randomBytes, timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { DeviceSession } from './session.mjs';

// A temporary loopback bench for the paired-device protocol. No cloud or OS controls.
export async function openDeviceBench({ onSession, onMicrophone, ackTimeoutMs } = {}) {
  const pairingKey = randomBytes(32).toString('hex');
  const expected = Buffer.from(`Bearer ${pairingKey}`);
  const httpServer = http.createServer((req, res) => res.writeHead(404).end());
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  let authority;

  httpServer.on('upgrade', (req, socket, head) => {
    const reject = status => socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    if (req.url !== '/device/v1' || req.headers.host !== authority) return reject('404 Not Found');
    if (req.headers.origin !== undefined) return reject('403 Forbidden');
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return reject('401 Unauthorized');
    }
    if (wss.clients.size) return reject('409 Conflict');
    wss.handleUpgrade(req, socket, head, client => wss.emit('connection', client));
  });

  wss.on('connection', socket => {
    const session = new DeviceSession({
      ackTimeoutMs,
      onMicrophone,
      send(message) {
        if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 32 * 1024) {
          socket.terminate();
          throw new Error('device link unavailable');
        }
        socket.send(JSON.stringify(message));
      },
      onClose(reason) {
        if (socket.readyState === WebSocket.OPEN) socket.close(1008, reason);
      },
    });
    socket.on('message', (raw, binary) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      try {
        if (binary) return socket.close(1003, 'JSON text required');
        session.receive(JSON.parse(raw.toString()));
      } catch {
        socket.close(1008, 'invalid device message');
      }
    });
    socket.on('error', () => socket.terminate());
    socket.on('close', () => session.close());
    onSession?.(session);
  });

  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  authority = `127.0.0.1:${httpServer.address().port}`;
  return {
    url: `ws://${authority}/device/v1`,
    pairingKey,
    async close() {
      const stopped = once(wss, 'close');
      for (const socket of wss.clients) socket.terminate();
      wss.close();
      await Promise.all([stopped, new Promise(resolve => httpServer.close(resolve))]);
    },
  };
}
