/**
 * Original StormPT character-record transfer.
 *
 * Source: C:\StormPT-2703\Source\SrcGame\src\record.h and record.cpp:
 *   TRANS_RECORD_DATAS: int32 size, code, Count, Total, TransSize;
 *                       char szData[smSOCKBUFF_SIZE-32]
 *   Header 20 bytes, data at byte 20, wire size = data bytes + 32.
 *   The last 12 bytes of each frame are NOT part of szData.
 *
 * This is read-only parsing. It neither authenticates a player nor writes
 * character state to the game server.
 */
export const RECORD_FRAGMENT_LAYOUT = Object.freeze({
  opcode: 4, // OpCode::OPCODE_RECORDDATA from Source/Shared/smPacket.h
  headerBytes: 20,
  overheadBytes: 32,
  maxPacketBytes: 8192,
  maxDataBytes: 8160,
  maxParts: 64, // TransDataBlock[64] in record.h
  maxRecordBytes: 64 * 8160,
});

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError('Expected Uint8Array or ArrayBuffer');
}

export function decodeRecordFragment(input) {
  const bytes = asBytes(input);
  const L = RECORD_FRAGMENT_LAYOUT;
  if (bytes.byteLength < L.overheadBytes || bytes.byteLength > L.maxPacketBytes)
    throw new RangeError('Invalid record frame size');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameSize = view.getInt32(0, true);
  const opcode = view.getInt32(4, true);
  const index = view.getInt32(8, true);
  const rawTotal = view.getInt32(12, true);
  const dataLength = view.getInt32(16, true);
  if (frameSize !== bytes.byteLength) throw new RangeError('Record frame size mismatch');
  if (opcode !== L.opcode) throw new RangeError('Not a record fragment');
  // The original SendRecordDataToClient calculates Total=0 for a record
  // smaller than 8160 bytes. It still sends Count=0 once; accept that case.
  const legacySinglePart = rawTotal === 0 && index === 0 &&
    dataLength > 0 && dataLength <= L.maxDataBytes;
  const total = legacySinglePart ? 1 : rawTotal;
  if (total < 1 || total > L.maxParts || index < 0 || index >= total)
    throw new RangeError('Invalid fragment count/total');
  if (dataLength < 1 || dataLength > L.maxDataBytes ||
      frameSize !== dataLength + L.overheadBytes)
    throw new RangeError('Invalid record fragment data length');
  if (index < total - 1 && dataLength !== L.maxDataBytes)
    throw new RangeError('Non-final fragment must be full-sized');
  return {
    index, total, dataLength,
    data: bytes.slice(L.headerBytes, L.headerBytes + dataLength),
  };
}

export class RecordAssembler {
  constructor({ timeoutMs = 15_000, maxRecordBytes = RECORD_FRAGMENT_LAYOUT.maxRecordBytes } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
        !Number.isSafeInteger(maxRecordBytes) || maxRecordBytes < 8 ||
        maxRecordBytes > RECORD_FRAGMENT_LAYOUT.maxRecordBytes)
      throw new RangeError('Invalid assembler limits');
    this.timeoutMs = timeoutMs;
    this.maxRecordBytes = maxRecordBytes;
    this.reset();
  }
  reset() {
    this.parts = null;
    this.total = 0;
    this.startedAt = 0;
    this.bytesReceived = 0;
  }
  feed(input, now = Date.now()) {
    if (!Number.isFinite(now)) throw new RangeError('Invalid timestamp');
    let fragment;
    try { fragment = decodeRecordFragment(input); }
    catch (err) { this.reset(); throw err; }
    if (!this.parts || now - this.startedAt > this.timeoutMs) {
      this.parts = Array(fragment.total);
      this.total = fragment.total;
      this.startedAt = now;
      this.bytesReceived = 0;
    }
    if (this.total !== fragment.total) {
      this.reset();
      throw new RangeError('Fragment total changed during record transfer');
    }
    const previous = this.parts[fragment.index];
    if (previous) {
      if (previous.length !== fragment.data.length ||
          previous.some((b, i) => b !== fragment.data[i])) {
        this.reset();
        throw new RangeError('Conflicting duplicate record fragment');
      }
      return null;
    }
    if (this.bytesReceived + fragment.dataLength > this.maxRecordBytes) {
      this.reset();
      throw new RangeError('Record exceeds configured memory cap');
    }
    this.parts[fragment.index] = fragment.data;
    this.bytesReceived += fragment.dataLength;
    for (let i = 0; i < this.total; i++) if (!this.parts[i]) return null;
    const record = new Uint8Array(this.bytesReceived);
    let cursor = 0;
    for (const p of this.parts) { record.set(p, cursor); cursor += p.length; }
    this.reset();
    if (record.length < 8) throw new RangeError('Truncated original record');
    const header = new DataView(record.buffer, record.byteOffset, record.byteLength);
    if (header.getInt32(0, true) !== record.length ||
        header.getInt32(4, true) !== RECORD_FRAGMENT_LAYOUT.opcode)
      throw new RangeError('Invalid reassembled record header');
    return record;
  }
}
