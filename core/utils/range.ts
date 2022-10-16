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
    return textDecoder.decode(this.buffer).replace(/\0/g, "");
  }

  getCString(offset: number): string {
    const charArray = new Uint8Array(this.buffer);
    let i = offset;
    while (i < this._end) if (charArray[i++] == 0) break;
    const stringRange = this.slice(offset, i);
    return textDecoder.decode(stringRange.buffer).replace(/\0/g, "");
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
    const range = this.slice(offset, offset + length);
    return new Int8Array(range.buffer);
  }

  getUint8Array(offset: number, length: number): Uint8Array {
    const range = this.slice(offset, offset + length);
    return new Uint8Array(range.buffer);
  }

  getUint8ClampedArray(offset: number, length: number): Uint8ClampedArray {
    const range = this.slice(offset, offset + length);
    return new Uint8ClampedArray(range.buffer);
  }

  getInt16Array(offset: number, length: number): Int16Array {
    const range = this.slice(offset, offset + 2 * length);
    return new Int16Array(range.buffer);
  }

  getUint16Array(offset: number, length: number): Uint16Array {
    const range = this.slice(offset, offset + 2 * length);
    console.log(range);
    return new Uint16Array(range.buffer);
  }

  getFloat32Array(offset: number, length: number): Float32Array {
    const range = this.slice(offset, offset + 4 * length);
    return new Float32Array(range.buffer);
  }
}
