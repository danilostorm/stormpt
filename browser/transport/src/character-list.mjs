/**
 * Decoder for REAL StormPT opcode 9 (TRANS_USERCHAR_INFO).
 * Verified 2026-10-23 against:
 *   C:\StormPT-2703\Source\SrcGame\src\record.h
 *   C:\StormPT-2703\Source\Shared\smPacket.h
 *   C:\StormPT-2703\Source\SrcGame\src\HoBaram\HoLinkHeader.cpp
 *
 * Original C++ Win32 alignment (DWORD/int 4-byte):
 *   size/code             offset 0 / 4
 *   szID[21]              offset 8
 *   padding               offset 29..31
 *   PlayUserCount         offset 32
 *   CharInfo[11]          offset 36, each 240 bytes
 *
 * Read-only: does not generate login requests or mutate character records.
 */
import { inspectPacket } from './packets.mjs';

export const CHARACTER_LIST_LAYOUT = Object.freeze({
  OPCODE: 9,
  ACCOUNT_OFFSET: 8,
  ACCOUNT_BYTES: 21,
  COUNT_OFFSET: 32,
  CHARACTER_OFFSET: 36,
  CHARACTER_BYTES: 240,
  MAX_CHARACTERS: 11,
  FULL_PACKET_BYTES: 2676,
});

const decoder = new TextDecoder('windows-1252');

function readCString(buf, offset, length, field) {
  if (offset < 0 || offset + length > buf.length) throw new RangeError('Truncated ' + field);
  const raw = buf.subarray(offset, offset + length);
  const terminator = raw.indexOf(0);
  if (terminator < 0) throw new RangeError('Unterminated ' + field);
  const bytes = raw.subarray(0, terminator);
  // Reject embedded control codes, not normal Portuguese accents.
  if (bytes.some(x => x < 32 || x === 127)) throw new RangeError('Control code in ' + field);
  return decoder.decode(bytes);
}

export function decodeCharacterList(packet, { expectedAccount } = {}) {
  const buffer = packet instanceof Uint8Array ? packet :
    packet instanceof ArrayBuffer ? new Uint8Array(packet) : null;
  if (!buffer) throw new TypeError('Expected binary packet');
  const header = inspectPacket(buffer);
  const L = CHARACTER_LIST_LAYOUT;
  if (header.opcode !== L.OPCODE) throw new RangeError('Not a character-list packet');
  if (buffer.length < L.CHARACTER_OFFSET || buffer.length > L.FULL_PACKET_BYTES)
    throw new RangeError('Invalid character-list packet length');
  const account = readCString(buffer, L.ACCOUNT_OFFSET, L.ACCOUNT_BYTES, 'account');
  if (!account) throw new RangeError('Empty account');
  if (expectedAccount !== undefined && account !== expectedAccount)
    throw new Error('Character-list account mismatch');
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getInt32(L.COUNT_OFFSET, true);
  if (count < 0 || count > L.MAX_CHARACTERS)
    throw new RangeError('Invalid character count');
  if (L.CHARACTER_OFFSET + count * L.CHARACTER_BYTES > buffer.length)
    throw new RangeError('Truncated character records');
  const characters = [];
  const names = new Set();
  for (let i = 0; i < count; i++) {
    const o = L.CHARACTER_OFFSET + i * L.CHARACTER_BYTES;
    const name = readCString(buffer, o, 32, 'character name');
    if (!name || names.has(name.toLocaleLowerCase('pt-BR')))
      throw new RangeError('Empty or duplicate character name');
    names.add(name.toLocaleLowerCase('pt-BR'));
    const bodyModel = readCString(buffer, o + 32, 64, 'body model');
    const faceModel = readCString(buffer, o + 96, 64, 'face model');
    const job = view.getUint32(o + 160, true);
    const level = view.getInt32(o + 164, true);
    const brood = view.getUint32(o + 168, true);
    const armorCode = view.getUint32(o + 172, true);
    const startField = view.getInt32(o + 176, true);
    const positionX = view.getInt32(o + 180, true);
    const positionZ = view.getInt32(o + 184, true);
    if (level < 1 || level > 1000 || startField < 0 || startField > 10000)
      throw new RangeError('Implausible character level/field');
    characters.push({
      name, bodyModel, faceModel, job, level, brood,
      armorCode, startField, positionX, positionZ,
    });
  }
  return { account, characters, count };
}
