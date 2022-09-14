import { BufferRange } from "../range";
import { hash2filename } from "./db";

enum WadVersion {
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
    const filename = hash2filename(this.hash);
    if (filename !== null)
      return filename;
    return this.hash.toString(16);
  }

  get content(): ArrayBuffer {
    const range = this.range.reset(this.offset, this.offset + this.sizeCompressed);
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

    let fileRange = ret.range.slice(8);
    for (let i = 0; i < ret.count; i++) {
      const file = WadFile.load(fileRange);
      ret.files.push(file);
      fileRange = fileRange.slice(file.range.size);
    }

    return ret;
  }
}
