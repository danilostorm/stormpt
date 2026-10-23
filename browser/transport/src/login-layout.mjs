/**
 * Binary schema transcribed from the REAL StormPT sources:
 *   Source/Shared/smPacket.h: ACCOUNT_SIZE=21, PASSWORD_SIZE=32
 *   SrcGame/src/Login/Login.h: LoginPacket (Windows x86 struct).
 *   Source/Shared/smPacket.h: OpCode::OPCODE_ID_GETUSERINFO=8.
 *
 * This module only serializes the wire layout. Sending a login from a web
 * client is intentionally NOT enabled until a dedicated, secure browser
 * authentication flow is implemented on the real server.
 */
import { inspectPacket } from './packets.mjs';
export const LOGIN_PACKET_LAYOUT = Object.freeze({
  SIZE:400, OPCODE:8, ACCOUNT:21, PASSWORD:32, HASH:33,
  MAC:30, PATH:260, COMPUTER_NAME:16,
});
const ascii = (value, cap, field) => {
  if (typeof value !== 'string' || Buffer.byteLength(value,'ascii')!==value.length ||
      !/^[\x20-\x7e]*$/.test(value) || value.length >= cap) {
    throw new Error('Invalid '+field);
  }
  return Buffer.from(value,'ascii');
};
export function encodeOriginalLoginPacket({ account, password, clientHash, mac='', path='', computerName='' }) {
  const L=LOGIN_PACKET_LAYOUT;
  const result=Buffer.alloc(L.SIZE,0);
  result.writeInt32LE(L.SIZE,0);
  result.writeInt32LE(L.OPCODE,4);
  let offset=8;
  for (const [field, value, size] of [
    ['account',account,L.ACCOUNT],
    ['password',password,L.PASSWORD],
    ['clientHash',clientHash,L.HASH],
    ['mac',mac,L.MAC],
    ['path',path,L.PATH],
    ['computerName',computerName,L.COMPUTER_NAME]
  ]) {
    const data=ascii(value,size,field);
    if ((field==='account'||field==='password') && data.length===0)
      throw new Error('Missing '+field);
    if(field==='clientHash'&&!/^[0-9a-fA-F]{32}$/.test(value))
      throw new Error('Invalid clientHash');
    data.copy(result,offset);
    offset+=size;
  }
  if(offset!==L.SIZE) throw new Error('Incorrect source-derived layout');
  inspectPacket(result);
  return result;
}
