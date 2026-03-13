import { TextDecoder } from "@compat/util";

const textDecoder = new TextDecoder();

export class BufferRange {
  private _buffer: ArrayBuffer;
  private _begin: number;
  private _end: number;
  private _view: DataView;
  private _littleEndian: boolean;

  constructor(buffer?: ArrayBuffer, begin?: number, end?: number, littleEndian = true) {
    this._buffer = buffer === undefined ? new ArrayBuffer(0) : buffer;
    this._begin = begin === undefined ? 0 : begin;
    this._end = end === undefined ? this._buffer.byteLength : end;
    this._view = new DataView(this._buffer);
    this._littleEndian = littleEndian;
  }

  clone(): BufferRange {
    return new BufferRange(this._buffer, this._begin, this._end, this._littleEndian);
  }

  slice(begin: number, end?: number | undefined): BufferRange {
    begin += this._begin;
    end = end === undefined ? this._end : this._begin + end;
    return new BufferRange(this._buffer, begin, end, this._littleEndian);
  }

  reset(begin?: number, end?: number): BufferRange {
    return new BufferRange(this._buffer, begin, end, this._littleEndian);
  }

  get buffer(): ArrayBuffer {
    return this._buffer.slice(this._begin, this._end);
  }

  get begin(): number {
    return this._begin;
  }

  get end(): number {
    return this._end;
  }

  set end(value: number) {
    this._end = value;
  }

  get size(): number {
    return this._end - this._begin;
  }

  get le(): boolean {
    return this._littleEndian;
  }

  set le(value: boolean) {
    this._littleEndian = value;
  }

  set size(value: number) {
    if (this._begin + value > this._end) {
      console.error(`new size ${this._begin + value} is bigger than actual size ${this.size}`);
      return;
      //throw new Error("new length is bigger than actual length");
    }
    this._end = this._begin + value;
    this._view = new DataView(this._buffer);
  }

  getString(): string {
    return textDecoder.decode(new Uint8Array(this._buffer, this._begin, this.size)).replace(/\0/g, "");
  }

  getCString(offset: number): string {
    const abs = this._begin + offset;
    let end = abs;
    const buf = new Uint8Array(this._buffer);
    while (end < this._end && buf[end] !== 0) end++;
    return textDecoder.decode(new Uint8Array(this._buffer, abs, end - abs));
  }

  getHexadecimal(): string {
    return [...new Uint8Array(this.buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  getInt8(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getInt8(i);
  }

  getUint8(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getUint8(i);
  }

  getInt16(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getInt16(i, this._littleEndian);
  }

  getUint16(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getUint16(i, this._littleEndian);
  }

  getUint24(offset: number): number {
    return this.getUint32(offset) >> 8;
  }

  getInt32(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getInt32(i, this._littleEndian);
  }

  getUint32(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getUint32(i, this._littleEndian);
  }

  getUint64(offset: number): [lo: number, hi: number] {
    const i = this._begin + offset;
    if (this._littleEndian) {
      return [this._view.getUint32(i, true), this._view.getUint32(i + 4, true)];
    }
    return [this._view.getUint32(i + 4, false), this._view.getUint32(i, false)];
  }

  getUint40(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    let v = this._view.getUint32(i, this._littleEndian);
    v = (v << 8) + this._view.getUint8(i + 4);
    return v;
  }

  getUint48(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    let v = this._view.getUint32(i, this._littleEndian);
    v += this._view.getUint16(i + 4) << 32;
    return v;
  }

  getFloat16(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    const h = this._view.getUint16(i, this._littleEndian);
    var s = (h & 0x8000) >> 15;
    var e = (h & 0x7c00) >> 10;
    var f = h & 0x03ff;

    if (e == 0) {
      return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
    } else if (e == 0x1f) {
      return f ? NaN : (s ? -1 : 1) * Infinity;
    }

    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / Math.pow(2, 10));
  }

  getFloat32(offset: number): number {
    const i = this._begin + offset;
    //if (i >= this._end) console.warn("Out of bounds access");
    return this._view.getFloat32(i, this._littleEndian);
  }

  getArrayBuffer(offset: number, length: number): ArrayBuffer {
    return this._buffer.slice(this._begin + offset, this._begin + offset + length);
  }

  getBuffer(offset?: number, length?: number): Buffer {
    if (!offset) offset = 0;
    if (!length) length = this.size;
    const arrayBuffer = this.getArrayBuffer(offset, length);
    return Buffer.from(arrayBuffer);
  }

  getInt8Array(offset: number, length: number): Int8Array {
    return new Int8Array(this._buffer, this._begin + offset, length);
  }

  getUint8Array(offset: number, length: number): Uint8Array {
    return new Uint8Array(this._buffer, this._begin + offset, length);
  }

  getUint8ClampedArray(offset: number, length: number): Uint8ClampedArray {
    return new Uint8ClampedArray(this._buffer, this._begin + offset, length);
  }

  getInt16Array(offset: number, length: number): Int16Array {
    const abs = this._begin + offset;
    if (this._littleEndian) return new Int16Array(this._buffer, abs, length);
    const out = new Int16Array(length);
    for (let i = 0; i < length; i++) out[i] = this._view.getInt16(abs + i * 2, false);
    return out;
  }

  getUint16Array(offset: number, length: number): Uint16Array {
    const abs = this._begin + offset;
    if (this._littleEndian) return new Uint16Array(this._buffer, abs, length);
    const out = new Uint16Array(length);
    for (let i = 0; i < length; i++) out[i] = this._view.getUint16(abs + i * 2, false);
    return out;
  }

  getUint32Array(offset: number, length: number): Uint32Array {
    const abs = this._begin + offset;
    if (this._littleEndian) return new Uint32Array(this._buffer, abs, length);
    const out = new Uint32Array(length);
    for (let i = 0; i < length; i++) out[i] = this._view.getUint32(abs + i * 4, false);
    return out;
  }

  getFloat32Array(offset: number, length: number): Float32Array {
    const abs = this._begin + offset;
    if (this._littleEndian) return new Float32Array(this._buffer, abs, length);
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) out[i] = this._view.getFloat32(abs + i * 4, false);
    return out;
  }

  getStridedInt8Array(offset: number, stride: number, itemSize: number, count: number): Int8Array {
    const out = new Int8Array(count * itemSize);
    const abs = this._begin + offset;
    for (let i = 0; i < count; i++) {
      const base = abs + i * stride;
      for (let c = 0; c < itemSize; c++) out[i * itemSize + c] = this._view.getInt8(base + c);
    }
    return out;
  }

  getStridedInt16Array(offset: number, stride: number, itemSize: number, count: number): Int16Array {
    const out = new Int16Array(count * itemSize);
    const abs = this._begin + offset;
    const le  = this._littleEndian;
    for (let i = 0; i < count; i++) {
      const base = abs + i * stride;
      for (let c = 0; c < itemSize; c++) out[i * itemSize + c] = this._view.getInt16(base + c * 2, le);
    }
    return out;
  }

  getStridedFloat32Array(offset: number, stride: number, itemSize: number, count: number): Float32Array {
    const out = new Float32Array(count * itemSize);
    const abs = this._begin + offset;
    const le  = this._littleEndian;
    for (let i = 0; i < count; i++) {
      const base = abs + i * stride;
      for (let c = 0; c < itemSize; c++) out[i * itemSize + c] = this._view.getFloat32(base + c * 4, le);
    }
    return out;
  }
}
