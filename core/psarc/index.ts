import { BufferRange } from "../utils/range";

import pako from "pako";

export class PsarcFile {
  range = new BufferRange();
  parent = new Psarc();

  md5 = "0000000000000000";
  index = 0;
  size = 0;
  offset = 0;
  name = "";

  static get size(): number {
    return 30;
  }

  static load(range: BufferRange, parent: Psarc): PsarcFile {
    const ret = new PsarcFile();
    ret.range = range.slice(0, this.size);
    ret.parent = parent;

    ret.md5 = ret.range.slice(0, 16).getHexadecimal();
    ret.index = ret.range.getUint32(16);
    ret.size = ret.range.getUint40(20);
    ret.offset = ret.range.getUint40(25);

    return ret;
  }

  get head(): ArrayBuffer {
    return this.parent.blocks[this.index].getUint8Array(false).slice(0, 10);
  }

  get content(): ArrayBuffer {
    const finalarray = new Uint8Array(this.size);
    let index = this.index;
    let position = 0;
    while (position < finalarray.length) {
      const array = this.parent.blocks[index].getUint8Array();
      finalarray.set(array, position);
      position += array.length;
      index++;
    }
    return finalarray.buffer;
  }

  get filename(): string {
    return this.name;
  }
}

export class PsarcBlock {
  id = 0;
  size = 0;
  range = new BufferRange();

  constructor(id: number, size: number) {
    this.id = id;
    this.size = size;
  }

  get offset(): number {
    return this.range.begin;
  }

  getUint8Array(inflate = true): Uint8Array {
    const deflated = this.range.getUint8Array(0, this.range.size);
    if (inflate) {
      if (deflated[0] == 0x78 && deflated[1] == 0xda) return pako.inflate(deflated);
    }
    return deflated;
  }

  get data(): ArrayBuffer {
    const array = this.getUint8Array();
    return array.buffer;
  }
}

export class PsarcManifest {
  names = [] as string[];

  static load(buffer: ArrayBuffer): PsarcManifest {
    const ret = new PsarcManifest();

    let range = new BufferRange(buffer);
    const text = range.getString();
    ret.names = text.split("\n");
    return ret;
  }
}

export class Psarc {
  range = new BufferRange();

  magic = "PSAR"; // PlayStation ARchive
  version_major = 1;
  version_minor = 3;
  compression = "zlib"; // zlib (default), lzma
  toc_length = 0; // Includes 32 byte header length + block length table following ToC
  toc_entry_size = 30; // Default is 30 bytes
  toc_entries = 1; // The manifest is always included as the first file in the archive without an assigned ID
  block_size = 65536; // Default is 65536 bytes
  archive_flags = 0; // 0 = relative paths (default) 1 = ignorecase paths 2 = absolute paths
  blocks = [] as PsarcBlock[];
  files = [] as PsarcFile[];

  get blockBytes(): number {
    if (this.block_size == 2 ** 8) return 1;
    if (this.block_size == 2 ** 16) return 2;
    if (this.block_size == 2 ** 24) return 3;
    return 0;
  }

  static load(buffer: ArrayBuffer): Psarc {
    const ret = new Psarc();
    ret.range = new BufferRange(buffer, undefined, undefined, false);

    ret.magic = ret.range.slice(0, 4).getString();
    ret.version_major = ret.range.getUint16(4);
    ret.version_minor = ret.range.getUint16(6);
    ret.compression = ret.range.slice(8, 12).getString();
    ret.toc_length = ret.range.getUint32(12);
    ret.toc_entry_size = ret.range.getUint32(16);
    ret.toc_entries = ret.range.getUint32(20);
    ret.block_size = ret.range.getUint32(24);
    ret.archive_flags = ret.range.getUint32(28);

    let fileRange = ret.range.slice(32);

    // Load TOC
    if (ret.toc_entry_size == 30) {
      for (let i = 0; i < ret.toc_entries; i++) {
        const file = PsarcFile.load(fileRange, ret);
        ret.files.push(file);
        fileRange = fileRange.slice(PsarcFile.size);
      }
    }

    // Get blocks
    const block_bytes = ret.blockBytes;
    const block_count = (ret.toc_length - fileRange.begin) / block_bytes;
    const block_range = fileRange.slice(0, block_count * block_bytes);
    for (let i = 0; i < block_count; i++) {
      let block_size = 0;
      switch (block_bytes) {
        case 1:
          block_size = block_range.getUint8(i * block_bytes);
          break;
        case 2:
          block_size = block_range.getUint16(i * block_bytes);
          break;
        case 3:
          block_size = block_range.getUint24(i * block_bytes);
          break;
        case 4:
          block_size = block_range.getUint32(i * block_bytes);
          break;
      }
      if (block_size == 0)
        block_size = ret.block_size;
      const block = new PsarcBlock(i, block_size);
      ret.blocks.push(block);
    }

    // Fix fileRange begining
    fileRange = fileRange.slice(block_range.size);

    // Load every block
    for (let i = 0; i < ret.blocks.length; i++) {
      const block_size = ret.blocks[i].size;
      ret.blocks[i].range = fileRange.slice(0, block_size);
      fileRange = fileRange.slice(block_size);
    }

    // Check nothing was missed
    if (fileRange.size > 0) {
      console.warn("There is some left over");
      console.log(fileRange);
      console.log(ret);
    }

    // Get manifest
    ret.files[0].name = "Manifest";
    const manifestData = ret.files[0].content;
    const manifest = PsarcManifest.load(manifestData);

    // Check all filenames are here
    if (manifest.names.length != ret.toc_entries - 1) {
      console.warn("Something went wrong");
      return ret;
    }

    // Set filenames
    for (let i = 1; i < ret.toc_entries; i++) ret.files[i].name = manifest.names[i - 1];

    console.log(ret.files);
    return ret;
  }

  get version(): string {
    return `${this.version_major}.${this.version_minor}`;
  }

  get size(): number {
    return this.range.reset().size;
  }
}
