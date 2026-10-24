import {inspectPacket} from './packets.mjs';
export const WEB_LOGIN=Object.freeze({size:1040,opcode:8,magic:0x31575453,version:1,ticketOffset:16});
export function readWebTicket(token,{audience='stormpt-gameserver'}={}){
 if(typeof token!=='string'||token.length>1023||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))throw Error('Malformed native ticket');
 const [payload]=token.split('.');
 let json,claims;
 try{
  const binary=atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
  if(btoa(binary).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')!==payload)throw Error();
  json=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
  claims=JSON.parse(json);
 }catch{throw Error('Invalid native ticket payload');}
 if(claims.aud!==audience||typeof claims.account!=='string'||
    !/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(claims.account)||
    !Number.isSafeInteger(claims.exp)||
    !/^[A-Za-z0-9_-]{22}$/.test(claims.nonce)||
    !/^[0-9a-f]{32}$/.test(claims.sid))throw Error('Invalid native ticket claims');
 // Parsing is for binding/serialization only. The GameServer verifies signature.
 return claims;
}
export function encodeWebLoginPacket({gameTicket,expectedAccount,expectedSid}){
 const claims=readWebTicket(gameTicket);
 if(claims.account!==expectedAccount||(expectedSid!==undefined&&claims.sid!==expectedSid))
  throw Error('Native ticket session/account mismatch');
 const bytes=new Uint8Array(WEB_LOGIN.size),v=new DataView(bytes.buffer);
 v.setUint32(0,WEB_LOGIN.size,true);v.setUint32(4,WEB_LOGIN.opcode,true);
 v.setUint32(8,WEB_LOGIN.magic,true);v.setUint32(12,WEB_LOGIN.version,true);
 bytes.set(new TextEncoder().encode(gameTicket),WEB_LOGIN.ticketOffset);
 return bytes;
}
export function decodeWebLoginPacket(packet,{expectedAccount,expectedSid}={}){
 const {opcode,length}=inspectPacket(packet);
 if(opcode!==WEB_LOGIN.opcode||length!==WEB_LOGIN.size)throw Error('Invalid native login size/opcode');
 const bytes=packet instanceof Uint8Array?packet:new Uint8Array(packet);
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(8,true)!==WEB_LOGIN.magic||v.getUint32(12,true)!==WEB_LOGIN.version)
  throw Error('Unknown native web login protocol');
 const body=bytes.subarray(WEB_LOGIN.ticketOffset),end=body.indexOf(0);
 if(end<1||body.subarray(end).some(x=>x!==0)||body.subarray(0,end).some(x=>x>127))
  throw Error('Invalid native ticket string/padding');
 const gameTicket=new TextDecoder().decode(body.subarray(0,end));
 const claims=readWebTicket(gameTicket);
 if((expectedAccount!==undefined&&claims.account!==expectedAccount)||
    (expectedSid!==undefined&&claims.sid!==expectedSid))throw Error('Native ticket session/account mismatch');
 return {gameTicket,claims};
}
export function encodeWebCharacterSelection({characterName}){
 if(typeof characterName!=='string'||characterName.length<1||characterName.length>31||
    !/^[\x20-\x7e]+$/.test(characterName))throw Error('Invalid character name');
 const b=new Uint8Array(52),v=new DataView(b.buffer);
 v.setUint32(0,52,true);v.setUint32(4,5,true);v.setUint32(16,WEB_LOGIN.version,true);
 b.set(new TextEncoder().encode(characterName),20);return b;
}
