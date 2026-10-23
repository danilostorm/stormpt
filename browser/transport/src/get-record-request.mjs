/**
 * Exact Win32 smTRANS_CHAR_COMMAND packet used by SendGetRecordData().
 * Source: SrcGame/src/netplay.cpp:8800-8817
 *         Source/Shared/smPacket.h:2063-2084.
 *
 * This is a serializer only. The browser has no Game.exe checksum or
 * trusted Client_Version, so these MUST come from a future server-authorized
 * browser protocol adapter. Never forge dwExeCheckSum or disable anti-cheat.
 */
import { inspectPacket } from './packets.mjs';

export const GET_RECORD_REQUEST_LAYOUT = Object.freeze({
  SIZE: 52,
  OPCODE: 5, // OPCODE_GETRECORDDATA
  L_PARAM_OFFSET: 8,
  W_PARAM_OFFSET: 12,
  S_PARAM_OFFSET: 16,
  NAME_OFFSET: 20,
  NAME_BYTES: 32,
});

export function encodeGetRecordRequest({
  characterName, authorizedClientChecksum, authorizedClientVersion
}) {
  const L=GET_RECORD_REQUEST_LAYOUT;
  if (typeof characterName !== 'string' ||
      characterName.length < 1 || characterName.length >= L.NAME_BYTES ||
      !/^[\x20-\x7e]+$/.test(characterName))
    throw new RangeError('Invalid character name');
  if (!Number.isInteger(authorizedClientChecksum) ||
      authorizedClientChecksum < 0 || authorizedClientChecksum > 0xffffffff)
    throw new RangeError('Server-authorized client checksum is required');
  if (!Number.isInteger(authorizedClientVersion) ||
      authorizedClientVersion < 1 || authorizedClientVersion > 0x7fffffff)
    throw new RangeError('Server-authorized client version is required');
  const bytes=new Uint8Array(L.SIZE);
  const view=new DataView(bytes.buffer);
  view.setInt32(0,L.SIZE,true);
  view.setInt32(4,L.OPCODE,true);
  view.setInt32(L.L_PARAM_OFFSET,0,true); // normal selection Mode FALSE
  view.setUint32(L.W_PARAM_OFFSET,authorizedClientChecksum,true);
  view.setInt32(L.S_PARAM_OFFSET,authorizedClientVersion,true);
  for(let i=0;i<characterName.length;i++)
    bytes[L.NAME_OFFSET+i]=characterName.charCodeAt(i);
  inspectPacket(bytes);
  return bytes;
}
