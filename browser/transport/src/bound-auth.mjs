/**
 * Tickets issued only by the real StormPT account website after its
 * ASP.NET Session["StormPTPlayer"] and CSRF have been checked.
 * This file does not expose a public issuer or bypass the GameServer login.
 * Draft IIS handler lives in research/browser-ticket-draft.ashx (NOT deployed).
 */
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
const accountOK=a=>typeof a==='string'&&/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(a);
const sig=(text,secret)=>createHmac('sha256',secret).update(text).digest('base64url');
export function issueBoundTicket({secret,account,sessionId,now=Date.now(),ttlSeconds=45}) {
  if(typeof secret!=='string'||secret.length<32||!accountOK(account)||
     typeof sessionId!=='string'||sessionId.length<8||sessionId.length>256||
     !Number.isInteger(ttlSeconds)||ttlSeconds<1||ttlSeconds>60)
    throw new Error('Invalid trusted session/ticket input');
  const sid=createHmac('sha256',secret).update(sessionId).digest('hex').slice(0,32);
  const data={
    aud:'stormpt-browser-tcp',
    account,
    exp:Math.floor(now/1000)+ttlSeconds,
    nonce:randomBytes(16).toString('base64url'),
    sid
  };
  const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
  return payload+'.'+sig(payload,secret);
}
export function consumeBoundTicket({token,secret,usedNonces,now=Date.now()}) {
  if(typeof token!=='string'||token.length>1024||
     typeof secret!=='string'||secret.length<32||!(usedNonces instanceof Map))
    return null;
  const parts=token.split('.');
  if(parts.length!==2||!parts[0]||!parts[1])return null;
  const a=Buffer.from(parts[1]);
  const b=Buffer.from(sig(parts[0],secret));
  if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  let claims;
  try{
    claims=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  }catch{return null;}
  const seconds=Math.floor(now/1000);
  if(claims.aud!=='stormpt-browser-tcp'||!accountOK(claims.account)||
     !Number.isSafeInteger(claims.exp)||claims.exp<=seconds||
     claims.exp>seconds+60||
     typeof claims.nonce!=='string'||!/^[A-Za-z0-9_-]{22}$/.test(claims.nonce)||
     typeof claims.sid!=='string'||!/^[0-9a-f]{32}$/.test(claims.sid))
    return null;
  for(const [nonce,expires] of usedNonces) if(expires<=seconds)usedNonces.delete(nonce);
  if(usedNonces.has(claims.nonce)||usedNonces.size>10000)return null;
  usedNonces.set(claims.nonce,claims.exp);
  return {account:claims.account,exp:claims.exp,sid:claims.sid};
}
