import { BufferRange } from "@core/utils/range";
import { Mipmaps } from "@core/utils/mipmaps";

class MIPHeader {
  range = new BufferRange();

  width = 128;
  height = 128;
  bpp = 1;
  mipmaps = 0;
  format = 1;
  flag = 0;
  cmapSize = 0;

  static load(range: BufferRange): MIPHeader {
    const ret = new MIPHeader();
    ret.range = range.slice(0, 16);

    ret.width = ret.range.getUint16(0);
    ret.height = ret.range.getUint16(2);
    ret.bpp = ret.range.getUint16(4);
    ret.mipmaps = ret.range.getUint8(6);
    ret.format = ret.range.getUint8(7);
    ret.flag = ret.range.getUint16(8);
    ret.cmapSize = (ret.bpp == 4 ? 0x40 : 0x400);

    console.log(ret.range);
    console.log(ret);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get swizzle(): boolean {
    return !!(this.format & 1);
  }
}

export class MIP {
  range = new BufferRange();
  header = new MIPHeader();

  cmapRange = new BufferRange();
  dataRange = new BufferRange();
  mipmaps: Mipmaps = [];

  static load(buffer: ArrayBuffer): MIP {
    const ret = new MIP();
    ret.range = new BufferRange(buffer);

    ret.header = MIPHeader.load(ret.range);
    ret.range = ret.range.slice(ret.header.size);

    ret.cmapRange = ret.range.slice(0, ret.header.cmapSize);
    ret.dataRange = ret.range.slice(ret.header.cmapSize);

    ret.loadTexture();
    return ret;
  }

  loadTexture() {
    this.mipmaps = [];

    const blockSize = this.cmapRange.size == 64 ? 32 : 16;
    const bpp = this.header.bpp == 4 ? 4 : 8;

    let width = this.header.width;
    let height = this.header.height;
    let offset = 0;

    for (let i = 0; i < this.header.mipmaps; i++) {
      console.log(this.dataRange.begin + offset, width, height)
      const memwidth = Math.min(blockSize, width);
      const memsize = Math.floor((memwidth * height * bpp) / 8);
      let mipmapRange = this.dataRange.slice(offset, offset + memsize);
      this.loadMipmap(mipmapRange, width, height, blockSize, bpp);
      offset += memsize;
      width /= 2;
      height /= 2;
    }
  }

  loadMipmap(range: BufferRange, width: number, height: number, blockSize: number, bpp: number) {
    const size = width * height;
    const rgba = new Uint8ClampedArray(size * 4);

    const blockReal = Math.min(width, blockSize);
    const blocks = (width * height) / blockReal;

    for (let i = 0; i < blocks; i++) {
      const blockOffset = (i * blockSize * bpp) / 8;
      const indices = range.slice(blockOffset, blockOffset + (blockReal * bpp) / 8);
      for (let j = 0; j < blockReal; j++) {
        let index = 0;
        if (bpp == 4) {
          index = indices.getUint8(j >>> 1);
          index = j % 2 == 0 ? index & 0b1111 : index >>> 4;
        } else {
          index = indices.getUint8(j);
        }
        const pixel = j + i * blockReal;
        rgba[pixel * 4 + 0] = this.cmapRange.getUint8(index * 4 + 0);
        rgba[pixel * 4 + 1] = this.cmapRange.getUint8(index * 4 + 1);
        rgba[pixel * 4 + 2] = this.cmapRange.getUint8(index * 4 + 2);
        rgba[pixel * 4 + 3] = 0xFF//this.cmapRange.getUint8(index + 4 + 3);
      }
    }

    // http://homebrew.pixelbath.com/wiki/PSP_texture_swizzling
    if (this.header.swizzle && width > blockReal) {
      const ch = 8;
      const cw = this.cmapRange.size == 64 ? 32 : 16;
      const cs = ch * cw;

      const tmp = new Uint8ClampedArray(size * 4);
      for (let ci = 0; ci < size / cs; ci++) {
        const chunk = rgba.slice(cs * 4 * ci, cs * 4 * (ci + 1));
        for (let l = 0; l < ch; l++) {
          let k = 0;
          k += (ci % (width / cw)) * cw;
          k += Math.floor(ci / (width / cw)) * ch * width;
          k += l * width;
          for (let c = 0; c < cw; c++) {
            const i = c + k;
            const j = c + l * cw;
            tmp[i * 4 + 0] = chunk[j * 4 + 0];
            tmp[i * 4 + 1] = chunk[j * 4 + 1];
            tmp[i * 4 + 2] = chunk[j * 4 + 2];
            tmp[i * 4 + 3] = chunk[j * 4 + 3];
          }
        }
      }
      this.mipmaps.push({ type: "RGBA", width, height, data: tmp });
      return;
    }

    this.mipmaps.push({ type: "RGBA", width, height, data: rgba });
  }

  export(): Mipmaps {
    return this.mipmaps;
  }
}
