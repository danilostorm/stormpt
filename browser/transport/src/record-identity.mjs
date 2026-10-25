/**
 * Read-only subset of smCHAR_INFO embedded at byte 16 of TRANS_RECORD_DATA.
 * Verified from SrcGame/src/record.h and Source/Shared/smPacket.h:
 *   smCHAR_INFO.szName[32] at 16
 *   szModelName[64] at 48; szModelName2[60] at 112
 *   dwObjectSerial at 176; JOB_CODE at 196; Level at 200
 *
 * Not a full character loader; items, save-state and coordinates are not
 * decoded here. Full record bytes remain available to future engine work.
 */
import { RECORD_FRAGMENT_LAYOUT } from './record-fragments.mjs';
const textDecoder = new TextDecoder('windows-1252');
function cstring(bytes, start, length) {
  if (bytes.length < start+length) throw new RangeError('Truncated record identity');
  const raw=bytes.subarray(start,start+length);
  const stop=raw.indexOf(0);
  if (stop < 0) throw new RangeError('Unterminated character string');
  const part=raw.subarray(0,stop);
  if (part.some(v=>v<32||v===127)) throw new RangeError('Control character in name');
  return textDecoder.decode(part);
}
export function decodeRecordIdentity(input) {
  const bytes = input instanceof Uint8Array ? input :
    input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes || bytes.length < 204) throw new RangeError('Record too short');
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (view.getInt32(0,true)!==bytes.length ||
      view.getInt32(4,true)!==RECORD_FRAGMENT_LAYOUT.opcode)
    throw new RangeError('Invalid original record header');
  const name=cstring(bytes,16,32);
  const bodyModel=cstring(bytes,48,64);
  const faceModel=cstring(bytes,112,60);
  const serial=view.getUint32(176,true);
  const job=view.getUint32(196,true);
  const level=view.getInt32(200,true);
  if (!name || level < 1 || level > 1000) throw new RangeError('Invalid character identity');
  return {name,bodyModel,faceModel,serial,job,level};
}
