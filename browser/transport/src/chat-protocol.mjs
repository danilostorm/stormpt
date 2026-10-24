/**
 * StormPT chat wire format, transcribed from the original Windows source:
 * Shared/smPacket.h: enum OpCode::OPCODE_CHATMESSAGE (22);
 * SrcGame/src/netplay.cpp: rsTRANS_SERVER::SendChat (8 + bytes + NUL);
 * SrcServer/src/Server/OnSever.cpp:14972-14980 TRANS_CHATBUFF
 *   int32 size, int32 opcode, uint32 dwIP, char message[NUL].
 * Original server disconnects for excessive chat input and interprets
 * leading '/' or '`' as commands: never send commands from this browser UI.
 */
import {inspectPacket} from './packets.mjs';
export const CHAT_OPCODE=22;
export const MAX_CHAT_BYTES=70;
const CP1252=Object.freeze({
  '\u20ac':0x80,'\u201a':0x82,'\u0192':0x83,'\u201e':0x84,'\u2026':0x85,
  '\u2020':0x86,'\u2021':0x87,'\u02c6':0x88,'\u2030':0x89,'\u0160':0x8a,
  '\u2039':0x8b,'\u0152':0x8c,'\u017d':0x8e,'\u2018':0x91,'\u2019':0x92,
  '\u201c':0x93,'\u201d':0x94,'\u2022':0x95,'\u2013':0x96,'\u2014':0x97,
  '\u02dc':0x98,'\u2122':0x99,'\u0161':0x9a,'\u203a':0x9b,'\u0153':0x9c,'\u017e':0x9e,'\u0178':0x9f,
});
function encodeWindows1252(value){
  const out=[];
  for(const char of value.normalize('NFC')){
    const code=char.codePointAt(0);
    if(code>=32 && code<=126 || code>=160&&code<=255)out.push(code);
    else if(Object.hasOwn(CP1252,char))out.push(CP1252[char]);
    else throw new RangeError('Caractere incompatível com o chat original do Priston Tale');
  }
  return Uint8Array.from(out);
}
export function encodeChatMessage(value){
  if(typeof value!=='string')throw new TypeError('Mensagem inválida');
  const text=value.trim();
  if(!text)throw new Error('Digite uma mensagem');
  // Reject native slash/backtick/party/global/GM commands and multiline control.
  if(/^[\/`~@]/.test(text) || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text))
    throw new Error('Comandos e caracteres de controle não permitidos');
  const bytes=encodeWindows1252(text);
  if(bytes.length>MAX_CHAT_BYTES)throw new RangeError('Chat original limitado a 70 bytes');
  const frame=new Uint8Array(9+bytes.length);
  const view=new DataView(frame.buffer);
  view.setInt32(0,frame.length,true);view.setInt32(4,CHAT_OPCODE,true);
  frame.set(bytes,8);
  frame[frame.length-1]=0;
  return frame;
}
export function decodeChatMessage(frame){
  if(!(frame instanceof Uint8Array))throw new TypeError('Expected Uint8Array');
  const {opcode,length}=inspectPacket(frame);
  if(opcode!==CHAT_OPCODE || length<14 || length>268)
    throw new RangeError('Malformed original chat broadcast');
  const view=new DataView(frame.buffer,frame.byteOffset,frame.byteLength);
  const origin=view.getUint32(8,true);
  const raw=frame.subarray(12);
  const nul=raw.indexOf(0);
  if(nul<1 || nul!==raw.length-1)throw new RangeError('Malformed chat text');
  // Trust the original GameServer to authenticate the sender; never derive
  // player identity from this field or interpret incoming text as HTML.
  const text=new TextDecoder('windows-1252',{fatal:false}).decode(raw.subarray(0,nul));
  if(/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text))throw new RangeError('Invalid text control');
  return {origin,text};
}
export class ChatSendThrottle{
  constructor({minIntervalMs=2000,now=()=>Date.now()}={}){
    if(!Number.isInteger(minIntervalMs)||minIntervalMs<500||minIntervalMs>30000||typeof now!=='function')
      throw new Error('Invalid chat throttle');
    this.interval=minIntervalMs;this.now=now;this.last=-Infinity;
  }
  allow(){
    const t=this.now();
    if(!Number.isFinite(t))return false;
    if(t-this.last<this.interval)return false;
    this.last=t;return true;
  }
  reset(){this.last=-Infinity}
}

/** Gateway validation of raw browser-supplied chat, independent of the UI. */
export function validateClientChatFrame(frame){
  if(!(frame instanceof Uint8Array))throw new TypeError('Expected byte array');
  const {opcode,length}=inspectPacket(frame);
  if(opcode!==CHAT_OPCODE || length<10 || length>9+MAX_CHAT_BYTES)
    throw new RangeError('Invalid client chat packet size');
  const raw=frame.subarray(8,length-1);
  if(frame[length-1]!==0||raw.includes(0))throw new RangeError('Invalid chat terminator');
  const text=new TextDecoder('windows-1252').decode(raw);
  const canonical=encodeChatMessage(text);
  if(canonical.length!==frame.length || canonical.some((b,i)=>b!==frame[i]))
    throw new RangeError('Noncanonical client chat');
  return text;
}
