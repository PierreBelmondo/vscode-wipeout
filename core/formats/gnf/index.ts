import { BufferRange } from "../../utils/range";
import { Mipmaps } from "../../utils/mipmaps";
import { BC7 } from "@core/utils/bcdec";
import { GNMTexture } from "./gnm";

class GNFHeader {
  range = new BufferRange();

  magic = 0x01050000; // "GNF "
  allocated_size = 0;
  version = 1; // 1 or 2
  mipmaps = 0; // > 0
  alignment = 0; // << 31
  stream_size = 0;

  static load(range: BufferRange): GNFHeader {
    const ret = new GNFHeader();
    ret.range = range.slice(0, 0x10);
    ret.magic = ret.range.getUint32(0);
    ret.allocated_size = ret.range.getUint8(4);
    ret.version = ret.range.getUint8(8);
    ret.mipmaps = ret.range.getUint8(9);
    ret.alignment = ret.range.getUint8(10);
    ret.stream_size = ret.range.getUint32(12);

    if (ret.version < 1 && ret.version > 2) console.warn("GNF version should be 1 or 2");
    if (ret.mipmaps < 1) console.warn("GNF image count should be more than 1");
    if (ret.alignment > 0x1f) console.warn("GNF alignment should be less than 1 << 31");
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get byte_alignement() {
    return 1 << this.alignment;
  }
}

export class GNF {
  range = new BufferRange();
  header = new GNFHeader();
  textures = [] as GNMTexture[];
  mipmaps: Mipmaps = [];

  static load(buffer: ArrayBuffer): GNF {
    const ret = new GNF();
    ret.range = new BufferRange(buffer);
    ret.range.le = false;

    ret.header = GNFHeader.load(ret.range);

    let chunksRange = ret.range.slice(16);
    for (let i = 0; i < ret.header.mipmaps; i++) {
      const texture = GNMTexture.load(chunksRange);
      ret.textures.push(texture);
      chunksRange = chunksRange.slice(32);
    }

    // TODO: Check if user data is present.

    const balign = ret.header.byte_alignement;
    const dataRange = ret.range.slice(balign);
    ret.loadBC7(dataRange);
    return ret;
  }

  loadBC7(dataRange: BufferRange) {
    this.mipmaps = [];

    let dataOffset = 0;
    for (let i = 0; i < this.header.mipmaps; i++) {
      const texture = this.textures[i];
      let width = texture.width;
      let height = texture.height;
      for (let j = texture.baselevel; j < texture.lastlevel; j++) {
        const dataLength = BC7.size(width, height); 
        const data = dataRange.getUint8Array(dataOffset, dataLength);
        this.mipmaps.push({ type: "BC7", width, height, data });
        width = width / 2;
        height = height / 2;
        dataOffset += dataLength;
        dataOffset += this.header.byte_alignement - (dataOffset % this.header.byte_alignement);
      }
      console.warn("Not loading the rest of the texture offset is: " + dataOffset);
      break;
    }
  }

  export(): Mipmaps {
    return this.mipmaps;
  }
}
