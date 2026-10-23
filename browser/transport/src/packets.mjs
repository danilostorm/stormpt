/**
 * This framing derives from SrcGame/src/smwsock.cpp: length and opcode
 * are little-endian 32-bit integers, followed by that packet's bytes.
 * smSOCKBUFF_SIZE in smwsock.h is 8192 bytes.
 * No mock game packet structures or gameplay data are invented here.
 */
export const HEADER_BYTES = 8;
export const MAX_PACKET_BYTES = 8192;

export function inspectPacket(input) {
  // Browser-native Uint8Array / ArrayBuffer support; Buffer is a subclass
  // of Uint8Array in Node. No Buffer polyfill needed in the browser.
  const bytes = input instanceof Uint8Array ? input :
    input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes) throw new TypeError('Expected Uint8Array or ArrayBuffer');
  if (bytes.byteLength < HEADER_BYTES) throw new Error('Packet header incomplete');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getInt32(0, true);
  const opcode = view.getInt32(4, true);
  if (length < HEADER_BYTES || length > MAX_PACKET_BYTES)
    throw new RangeError('Invalid PT packet size');
  if (bytes.byteLength !== length) throw new Error('Packet length mismatch');
  return { length, opcode };
}

export class PacketDecoder {
  #buffer = Buffer.alloc(0);
  constructor(onPacket) {
    if (typeof onPacket !== 'function') throw new TypeError('onPacket callback required');
    this.onPacket = onPacket;
  }
  feed(chunk) {
    if (!Buffer.isBuffer(chunk)) throw new TypeError('Expected Buffer');
    if (chunk.length === 0) return;
    // Restrict queued bytes even when the remote sender is hostile.
    if (this.#buffer.length + chunk.length > MAX_PACKET_BYTES * 1024)
      throw new RangeError('Too many queued bytes');
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= HEADER_BYTES) {
      const length = this.#buffer.readInt32LE(0);
      if (length < HEADER_BYTES || length > MAX_PACKET_BYTES)
        throw new RangeError('Invalid PT packet size');
      if (this.#buffer.length < length) break;
      const packet = Buffer.from(this.#buffer.subarray(0, length));
      this.#buffer = this.#buffer.subarray(length);
      this.onPacket(packet);
    }
  }
  get queuedBytes() { return this.#buffer.length; }
}
