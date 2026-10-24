import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const enc = data => Buffer.from(JSON.stringify(data)).toString('base64url');
const mac = (s, key) => createHmac('sha256', key).update(s).digest('base64url');

export function issueToken({ secret, expiresInSeconds = 45, now = Date.now() }) {
  if (!secret || secret.length < 32) throw new Error('Missing HMAC secret');
  const payload = enc({
    aud: 'stormpt-browser-tcp',
    exp: Math.floor(now / 1000) + expiresInSeconds,
    nonce: randomBytes(16).toString('base64url'),
  });
  return payload + '.' + mac(payload, secret);
}

export function verifyToken(token, secret, usedNonces, now = Date.now()) {
  if (!secret || secret.length < 32 || typeof token !== 'string' || token.length > 1024)
    return false;
  const split = token.split('.');
  if (split.length !== 2 || !split[0] || !split[1]) return false;
  const expected = Buffer.from(mac(split[0], secret));
  const actual = Buffer.from(split[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(split[0], 'base64url').toString('utf8')); }
  catch { return false; }
  const seconds = Math.floor(now / 1000);
  if (payload.aud !== 'stormpt-browser-tcp'
      || typeof payload.exp !== 'number'
      || payload.exp <= seconds
      || payload.exp > seconds + 120
      || typeof payload.nonce !== 'string'
      || !/^[A-Za-z0-9_-]{20,40}$/.test(payload.nonce)
      || usedNonces.has(payload.nonce)) return false;
  for (const [nonce,expiry] of usedNonces) if (expiry <= seconds) usedNonces.delete(nonce);
  usedNonces.set(payload.nonce, payload.exp);
  return true;
}
