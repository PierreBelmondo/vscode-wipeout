import { BufferRange } from "@core/utils/range";
import { filenameFromHash } from "./hashes";
import { xtea8_ctr_bruteforce, xtea8_ctr_decrypt } from "./crypto";
import { lzss } from "@core/utils/lzss";
import zlib from "zlib";

export enum WadVersion {
  WAD_PSP = 1,
  WAD_PS2 = 2,
}

export class WadFile {
  range = new BufferRange();

  hash = 0;
  offset = 0;
  sizeUncompressed = 0;
  sizeCompressed = 0;

  static loadPSP(range: BufferRange): WadFile {
    const ret = new WadFile();
    ret.range = range.slice(0, 16);
    ret.hash = range.getUint32(0);
    ret.offset = range.getUint32(4);
    ret.sizeUncompressed = range.getUint32(8);
    ret.sizeCompressed = range.getUint32(12);
    return ret;
  }

  static loadPS2(range: BufferRange): WadFile {
    const ret = new WadFile();
    ret.range = range.slice(0, 12);
    ret.hash = range.getUint32(0);
    ret.sizeUncompressed = range.getUint32(4);
    ret.sizeCompressed = range.getUint32(4);
    ret.offset = range.getUint32(8);
    return ret;
  }

  get filename(): string {
    const filename = filenameFromHash(this.hash);
    if (filename !== null) return filename;
    return "Data/" + this.hash.toString(16);
  }

  get compressed(): boolean {
    return this.sizeUncompressed != this.sizeCompressed;
  }

  get content(): ArrayBuffer {
    const range = this.range.reset(this.offset, this.offset + this.sizeCompressed);
    if (this.compressed) {
      if (this.sizeUncompressed & (1 << 31)) {
        const inflated = zlib.inflateSync(range.buffer);
        return inflated.buffer.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength) as ArrayBuffer;
      } else {
        const decompressed = lzss.decompress(range.getBuffer(), this.sizeUncompressed);
        return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength) as ArrayBuffer;
      }
    }
    return range.buffer;
  }
}

export class Wad {
  range = new BufferRange();

  version = WadVersion.WAD_PSP;
  count = 0;

  files: WadFile[] = [];

  static load(buffer: ArrayBuffer): Wad {
    const range = new BufferRange(buffer);
    const magic = range.getUint32(0);

    if (magic === 1) return Wad.loadPSP(range);
    if (Wad.isPS2(range)) return Wad.loadPS2(range);
    return Wad.loadEncrypted(range);
  }

  /** PSP WAD: [version:u32=1][count:u32][entries × 16B: hash, offset, sizeUncompressed, sizeCompressed] */
  private static loadPSP(range: BufferRange): Wad {
    const ret = new Wad();
    ret.range = range;
    ret.version = WadVersion.WAD_PSP;
    ret.count = range.getUint32(4);

    let fileRange = range.slice(8);
    for (let i = 0; i < ret.count; i++) {
      const file = WadFile.loadPSP(fileRange);
      ret.files.push(file);
      fileRange = fileRange.slice(file.range.size);
    }

    return ret;
  }

  /** PS2 WAD: [count:u32][entries × 12B: hash, size, offset] — no version field, no compression */
  private static loadPS2(range: BufferRange): Wad {
    const ret = new Wad();
    ret.range = range;
    ret.version = WadVersion.WAD_PS2;
    ret.count = range.getUint32(0);

    let fileRange = range.slice(4);
    for (let i = 0; i < ret.count; i++) {
      const file = WadFile.loadPS2(fileRange);
      ret.files.push(file);
      fileRange = fileRange.slice(file.range.size);
    }

    return ret;
  }

  /** Detect PS2 WAD: first entry's offset must equal expected header size */
  private static isPS2(range: BufferRange): boolean {
    const count = range.getUint32(0);
    const headerSize = 4 + count * 12;
    if (count === 0 || count > 0xffff || headerSize > range.size) return false;
    return range.getUint32(4 + 8) === headerSize;
  }

  /** Encrypted PSP WAD — brute-force XTEA key then recurse */
  private static loadEncrypted(range: BufferRange): Wad {
    let buffer = range.getBuffer(0, 8);
    const dk = xtea8_ctr_bruteforce(buffer);
    if (dk == null) throw new Error("WAD file is encrypted or has wrong format");
    buffer = xtea8_ctr_decrypt(range.getBuffer(), dk.key);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    return Wad.load(ab);
  }
}
