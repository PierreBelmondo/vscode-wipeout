import { BufferRange } from "@core/utils/range";

/**
 * Byte-coverage instrumentation, shared by the format research scripts.
 *
 * Every scalar accessor in BufferRange reads through its private DataView, so
 * proxying DataView records exactly what the parser interprets. The array
 * accessors take a fast path that builds typed arrays directly on the backing
 * ArrayBuffer and never touch the DataView, so those are wrapped separately.
 *
 * Call this immediately before parsing, and read the returned array after.
 * It patches globals, so a process should do one measured parse.
 */
export function instrumentCoverage(byteLength: number): Uint8Array {
  const hits = new Uint8Array(byteLength);
  const mark = (off: number, len: number) => {
    const end = Math.min(byteLength, off + len);
    for (let i = Math.max(0, off); i < end; i++) hits[i] = 1;
  };

  const scalarWidth: { [name: string]: number } = {
    getInt8: 1, getUint8: 1, getInt16: 2, getUint16: 2,
    getInt32: 4, getUint32: 4, getFloat32: 4, getFloat64: 8,
  };
  const NativeDataView = DataView;
  (globalThis as any).DataView = new Proxy(NativeDataView, {
    construct(target, args: any[]) {
      const view = new (target as any)(...args);
      return new Proxy(view, {
        get(t: any, prop: string) {
          const value = t[prop];
          if (typeof value === "function" && prop in scalarWidth) {
            return (offset: number, ...rest: any[]) => {
              mark(offset, scalarWidth[prop]);
              return value.call(t, offset, ...rest);
            };
          }
          return typeof value === "function" ? value.bind(t) : value;
        },
      });
    },
  });

  const elementSize: { [name: string]: number } = {
    getInt8Array: 1, getUint8Array: 1, getUint8ClampedArray: 1,
    getInt16Array: 2, getUint16Array: 2, getUint32Array: 4, getFloat32Array: 4,
  };
  const proto = BufferRange.prototype as any;
  for (const name of Object.keys(elementSize)) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    proto[name] = function (offset: number, length: number, ...rest: any[]) {
      mark(this._begin + offset, length * elementSize[name]);
      return original.call(this, offset, length, ...rest);
    };
  }
  for (const name of ["getStridedInt8Array", "getStridedUint8Array", "getStridedInt16Array", "getStridedUint16Array", "getStridedFloat32Array"]) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    proto[name] = function (offset: number, stride: number, itemSize: number, count: number, ...rest: any[]) {
      mark(this._begin + offset, count * stride);
      return original.call(this, offset, stride, itemSize, count, ...rest);
    };
  }
  for (const name of ["getString", "getCString"]) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    proto[name] = function (...args: any[]) {
      const text = original.apply(this, args);
      const offset = name === "getCString" ? this._begin + (args[0] ?? 0) : this._begin;
      mark(offset, (typeof text === "string" ? text.length : 0) + 1);
      return text;
    };
  }
  return hits;
}

export type Gap = { offset: number; length: number; zero: boolean };

/** Contiguous runs of bytes the parser never read. */
export function findGaps(hits: Uint8Array, bytes: Uint8Array): Gap[] {
  const gaps: Gap[] = [];
  const size = hits.length;
  for (let i = 0; i < size; ) {
    if (hits[i]) { i++; continue; }
    const start = i;
    while (i < size && !hits[i]) i++;
    let zero = true;
    for (let k = start; k < i; k++) if (bytes[k] !== 0) { zero = false; break; }
    gaps.push({ offset: start, length: i - start, zero });
  }
  return gaps;
}

/** The shared "interpreted / unread / gaps / largest regions" report. */
export function reportCoverage(hits: Uint8Array, bytes: Uint8Array, topN = 15) {
  const size = hits.length;
  let read = 0;
  for (let i = 0; i < size; i++) if (hits[i]) read++;

  console.log(`  size        : ${size.toLocaleString()} bytes`);
  console.log(`  interpreted : ${read.toLocaleString()} (${((100 * read) / size).toFixed(2)}%)`);
  console.log(`  unread      : ${(size - read).toLocaleString()} (${((100 * (size - read)) / size).toFixed(2)}%)`);

  const gaps = findGaps(hits, bytes);
  const zeroed = gaps.filter((g) => g.zero);
  const zeroBytes = zeroed.reduce((sum, g) => sum + g.length, 0);
  console.log(`  gaps        : ${gaps.length} (${zeroed.length} all-zero = ${zeroBytes.toLocaleString()} bytes)`);

  const sorted = [...gaps].sort((a, b) => b.length - a.length);
  console.log(`  largest unread regions:`);
  for (const gap of sorted.slice(0, topN)) {
    console.log(`    0x${gap.offset.toString(16).padStart(8, "0")} ${String(gap.length).padStart(9)} bytes${gap.zero ? "  (zero)" : ""}`);
  }
  return { size, read, gaps };
}
