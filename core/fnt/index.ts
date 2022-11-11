import { Mipmap } from "@core/utils/mipmaps";
import { BufferRange } from "../utils/range";

class FNTImageHeader {
  range = new BufferRange();

  width = 0;
  height = 0;

  static load(range: BufferRange): FNTImageHeader {
    const ret = new FNTImageHeader();
    ret.range = range.slice(0, ret.size);
    ret.width = ret.range.getUint16(0);
    ret.height = ret.range.getUint16(2);
    return ret;
  }

  get size() {
    return 0x80;
  }
}

class FNTImage {
  range = new BufferRange();

  header = new FNTImageHeader();
  mipmap: Mipmap;

  static load(range: BufferRange): FNTImage {
    const ret = new FNTImage();
    ret.range = range.clone();
    ret.header = FNTImageHeader.load(ret.range);

    const mipmapRange = range.slice(ret.header.size);
    ret.mipmap = {
      type: "Gray4",
      width: ret.header.width,
      height: ret.header.height,
      data: mipmapRange.getUint8Array(0, mipmapRange.size),
    };
    return ret;
  }
}

class FNTHeader {
  range = new BufferRange();

  magic = 0x01464e54; // F N T \x1
  glyphs = 0;
  image_offset = 0;

  static load(range: BufferRange): FNTHeader {
    const ret = new FNTHeader();
    ret.range = range.slice(0, 0x40);
    ret.magic = ret.range.getUint32(0);
    ret.glyphs = ret.range.getUint32(4);
    ret.image_offset = ret.range.getUint32(24);
    return ret;
  }
}

export class FNT {
  range = new BufferRange();
  header = new FNTHeader();
  image = new FNTImage();

  static async load(buffer: ArrayBuffer) {
    const ret = new FNT();
    ret.range = new BufferRange(buffer);
    ret.range.le = false

    ret.header = FNTHeader.load(ret.range);
    console.log(ret);

    const imageRange = ret.range.slice(ret.header.image_offset);
    ret.image = FNTImage.load(imageRange);

    return ret;
  }
}
