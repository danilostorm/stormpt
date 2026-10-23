import http from 'node:http';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { inspectPacket, PacketDecoder } from './packets.mjs';
import { verifyToken } from './auth.mjs';
import { consumeBoundTicket } from './bound-auth.mjs';
import { GameLoginGuard } from './game-login-guard.mjs';

export function createGateway({
  listenHost = '127.0.0.1',
  listenPort = 3903,
  gameHost = '192.168.30.169',
  gamePort = 1997,
  origin = 'https://stormpt.hoststorm.com.br',
  secret,
  maxSessions = 10,
  requireBoundTicket = false,
  loginTimeoutMs = 15000,
  allowNativeWebLogin = false,
}) {
  if (!Number.isInteger(loginTimeoutMs) || loginTimeoutMs < 1000 || loginTimeoutMs > 60000)
    throw new RangeError('Invalid login timeout');
  if (!secret || secret.length < 32) throw new Error('Gateway HMAC secret missing');
  if(allowNativeWebLogin && !requireBoundTicket)throw Error('Native login requires bound tickets');
  const sessions = new Set();
  const usedNonces = new Map();
  const server = http.createServer((req, res) => {
    // No web game frontend is served from this port.
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store'});
    res.end('Not Found');
  });
  const wss = new WebSocketServer({
    noServer: true, perMessageDeflate: false, maxPayload: 8192,
    handleProtocols: protocols => protocols.has('stormpt-binary-v1') ? 'stormpt-binary-v1' : false,
  });
  server.on('upgrade', (req, socket, head) => {
    const route = req.url?.split('?')[0];
    if (route !== '/game' || req.headers.origin !== origin || sessions.size >= maxSessions) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\nCache-Control: no-store\r\n\r\n');
      return;
    }
    const protocols = String(req.headers['sec-websocket-protocol'] || '').split(',').map(x=>x.trim());
    const bearer = protocols.find(x=>x.startsWith('ticket.'));
    const claims = requireBoundTicket && bearer
      ? consumeBoundTicket({token:bearer.slice(7),secret,usedNonces})
      : null;
    const authorized = requireBoundTicket ? !!claims :
      !!bearer && verifyToken(bearer.slice(7), secret, usedNonces);
    if (!protocols.includes('stormpt-binary-v1') || !authorized) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\nCache-Control: no-store\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      ws.stormptBoundAccount = claims?.account ?? null;
      ws.stormptBoundSid = claims?.sid ?? null;
      wss.emit('connection', ws);
    });
  });
  wss.on('connection', ws => {
    // The authentic 1997 game server remains unchanged.
    const tcp = net.createConnection({host:gameHost, port:gamePort});
    const state = { ws, tcp, boundAccount:ws.stormptBoundAccount,
      guard:ws.stormptBoundAccount ? new GameLoginGuard({account:ws.stormptBoundAccount,loginTimeoutMs,allowNativeWebLogin,sessionBinding:ws.stormptBoundSid}) : null };
    sessions.add(state);
    let closed = false;
    let deadlineTimer;
    const dispose = () => {
      if (closed) return;
      closed = true;
      if (deadlineTimer) clearInterval(deadlineTimer);
      sessions.delete(state);
      state.guard?.close();
      try { tcp.destroy(); } catch {}
      try { ws.close(); } catch {}
    };
    // Enforce deadlines even when neither peer sends another packet.
    if (state.guard) {
      deadlineTimer = setInterval(() => {
        try { state.guard.checkDeadline(); } catch { dispose(); }
      }, 250);
      deadlineTimer.unref();
    }
    const decoder = new PacketDecoder(packet => {
      state.guard?.onServer(packet);
      if (ws.readyState === WebSocket.OPEN) {
        if (ws.bufferedAmount > 1024 * 1024) throw new RangeError('Slow browser client');
        ws.send(packet, { binary: true });
      }
    });
    tcp.setTimeout(120_000);
    tcp.on('timeout', dispose);
    tcp.on('error', dispose);
    tcp.on('end', dispose);
    tcp.on('data', chunk => {
      try { decoder.feed(chunk); } catch { dispose(); }
    });
    ws.on('message', (data, isBinary) => {
      if (!isBinary || closed || tcp.destroyed) return dispose();
      try {
        inspectPacket(data);
        state.guard?.onClient(data);
      } catch { return dispose(); }
      if (tcp.writableLength > 1024 * 1024) return dispose();
      tcp.write(data);
    });
    ws.on('close', dispose);
    ws.on('error', dispose);
  });
  return {
    server, sessions, start: () => new Promise(resolve => server.listen(listenPort, listenHost, resolve)),
    stop: () => new Promise(resolve => {
      for (const s of [...sessions]) { s.tcp.destroy(); s.ws.terminate(); }
      wss.close();
      server.close(resolve);
    })
  };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const keyPath = process.env.STORMPT_GATEWAY_KEY_PATH;
  if (!keyPath) throw new Error('Set STORMPT_GATEWAY_KEY_PATH');
  const gateway = createGateway({
    secret: readFileSync(keyPath).toString('utf8').trim(),
    listenHost: process.env.STORMPT_GATEWAY_BIND || '127.0.0.1',
    listenPort: Number(process.env.STORMPT_GATEWAY_PORT || 3903),
    requireBoundTicket: process.env.STORMPT_REQUIRE_BOUND_TICKET !== 'false',
    allowNativeWebLogin: process.env.STORMPT_ALLOW_NATIVE_WEB_LOGIN === 'true',
  });
  await gateway.start();
  console.log('StormPT browser transport bound to localhost:',gateway.server.address().port);
}
