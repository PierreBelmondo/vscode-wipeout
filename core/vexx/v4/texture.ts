import { Mipmaps } from "@core/utils/mipmaps";
import { BufferRange } from "../../utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeTexture extends VexxNode {
  properties = {
    width: 128,
    height: 128,
    bpp: 1,
    mipmaps: 0,
    format: 1,
    id: 0,
    cmapSize: 0,
    dataSize: 0,
    name: "",
    alphaTest: 0, // not sure
    diffuse: {
      // not sure
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    },
    external: false,
  };

  cmapRange = new BufferRange();
  dataRange = new BufferRange();
  mipmaps: Mipmaps = [];

  constructor() {
    super(Vexx4NodeType.TEXTURE);
  }

  override load(range: BufferRange): void {
    this.properties.width = range.getUint16(0);
    this.properties.height = range.getUint16(2);
    this.properties.bpp = range.getUint8(4);
    this.properties.mipmaps = range.getUint8(5);
    this.properties.format = range.getUint8(6);
    this.properties.id = range.getUint8(7);
    this.properties.cmapSize = range.getUint32(8);
    this.properties.dataSize = range.getUint32(12);
    this.properties.alphaTest = range.getFloat32(24);
    this.properties.diffuse = {
      r: range.getUint8(28),
      g: range.getUint8(29),
      b: range.getUint8(30),
      a: range.getUint8(31),
    };
    // unknown: 8 bytes (32 -> 40)
    // unknown: 8 bytes (40 -> 48)
    // unknown: 8 bytes (48 -> 56)
    this.properties.external = range.getUint32(48) == 0xffffffff;
    this.properties.name = range.slice(56).getString();
  }

  get swizzle(): boolean {
    return !!(this.properties.format & 1);
  }

  setCmapRange(begin: number, end: number) {
    this.cmapRange = this.range.reset(begin, end);
  }

  setDataRange(begin: number, end: number) {
    this.dataRange = this.range.reset(begin, end);
  }

  loadTexture() {
    this.mipmaps = [];

    const bpp = this.properties.bpp == 4 ? 4 : 8;
    const cw = this.cmapRange.size == 64 ? 32 : 16;

    let width = this.properties.width;
    let height = this.properties.height;
    let offset = 0;

    console.log(this.name);
    for (let i = 0; i < this.properties.mipmaps; i++) {
      const size = Math.floor((Math.max(width, cw) * height * bpp) / 8);
      const mipmapRange = this.dataRange.slice(offset, offset + size);
      this.loadMipmap(mipmapRange, width, height);
      offset += size;
      width /= 2;
      height /= 2;
    }

    console.log(offset, this.dataRange.size, this.dataRange.size - offset);
  }

  loadMipmap(range: BufferRange, width: number, height: number) {
    const cw = this.cmapRange.size == 64 ? 32 : 16;
    width = Math.max(width, cw);

    const is = width * height;
    const bpp = this.properties.bpp == 4 ? 4 : 8;

    let rgba = new Uint8ClampedArray(is * 4);
    for (let i = 0; i < width * height; i++) {
      let ci = 0;
      if (bpp == 4) {
        ci = range.getUint8(Math.floor(i / 2));
        ci = i % 2 == 0 ? ci & 0xf : ci >> 4;
      } else {
        ci = range.getUint8(i);
      }
      rgba[i * 4 + 0] = this.cmapRange.getUint8(ci * 4 + 0);
      rgba[i * 4 + 1] = this.cmapRange.getUint8(ci * 4 + 1);
      rgba[i * 4 + 2] = this.cmapRange.getUint8(ci * 4 + 2);
      rgba[i * 4 + 3] = this.cmapRange.getUint8(ci + 4 + 3);
    }

    if (this.swizzle) {
      const ch = 8;
      const cw = this.cmapRange.size == 64 ? 32 : 16;
      const cs = ch * cw;

      const tmp = new Uint8ClampedArray(is * 4);
      for (let ci = 0; ci < is / cs; ci++) {
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
      rgba = tmp;
    }

    this.mipmaps.push({ type: "RGBA", width, height, data: rgba });
  }
}
