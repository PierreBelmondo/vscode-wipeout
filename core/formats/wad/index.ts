import { BufferRange } from "../../utils/range";
import { filenameFromHash } from "./hashes";
import { xtea8_ctr_bruteforce, xtea8_ctr_decrypt } from "./crypto";
import { lzss } from "../../utils/lzss";
import zlib from "zlib";

export enum WadVersion {
  WAD_PSP = 1,
}

export class WadFile {
  range = new BufferRange();

  hash = 0;
  offset = 0;
  sizeUncompressed = 0;
  sizeCompressed = 0;

  static load(range: BufferRange): WadFile {
    const ret = new WadFile();
    ret.range = range.slice(0, 16);
    ret.hash = range.getUint32(0);
    ret.offset = range.getUint32(4);
    ret.sizeUncompressed = range.getUint32(8);
    ret.sizeCompressed = range.getUint32(12);
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
        return zlib.inflateSync(range.buffer);
      } else {
        return lzss.decompress(range.getBuffer(), this.sizeUncompressed);
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
    const ret = new Wad();
    ret.range = new BufferRange(buffer);

    ret.version = ret.range.getUint32(0);
    ret.count = ret.range.getUint32(4);

    if (ret.version != 1) {
      console.info("unexpected version for WAD file");

      let buffer = ret.range.getBuffer(0, 8);
      const dk = xtea8_ctr_bruteforce(buffer);
      if (dk == null) throw new Error("WAD file is encrypted or has wrong format");
      buffer = xtea8_ctr_decrypt(ret.range.getBuffer(), dk.key);
      let ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return Wad.load(ab);
    }

    let fileRange = ret.range.slice(8);
    for (let i = 0; i < ret.count; i++) {
      const file = WadFile.load(fileRange);
      ret.files.push(file);
      fileRange = fileRange.slice(file.range.size);
    }

    return ret;
  }
}
