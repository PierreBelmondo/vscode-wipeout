import { BufferRange } from "../../../core/range";
import { Flat } from "../flat";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeTexture extends VexxNode {
  properties = {
    width: 128,
    height: 128,
    bpp: 1,
    alphaMode: 0, // not sure
    format: 1,
    id: 0,
    cmapSize: 0,
    dataSize: 0,
    name: "",
    alphaTest: 0, // not sure
    diffuse: { // not sure
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    },
  };

  rgba = new Uint8ClampedArray(this.properties.width * this.properties.height);

  constructor() {
    super(Vexx4NodeType.TEXTURE);
  }

  override load(range: BufferRange): void {
    this.properties.width = range.getUint16(0);
    this.properties.height = range.getUint16(2);
    this.properties.bpp = range.getUint8(4);
    this.properties.alphaMode = range.getUint8(5);
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
    // 56 bytes ?
    this.properties.name = range.slice(16 + 40).getString();
  }

  loadColormap(range: BufferRange) {
    let width = 1;
    let height = range.size;

    if (range.size / 4 == 16) {
      width = height = 4;
    } else if (range.size / 4 == 256) {
      width = height = 16;
    }

    let rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4 + 0] = range.getUint8(i * 4 + 0);
      rgba[i * 4 + 1] = range.getUint8(i * 4 + 1);
      rgba[i * 4 + 2] = range.getUint8(i * 4 + 2);
      rgba[i * 4 + 3] = range.getUint8(i + 4 + 3);
    }
  }

  loadTexture(range: BufferRange) {
    const cmap = range.slice(0, this.properties.cmapSize);
    this.loadColormap(cmap);

    const data = range.slice(this.properties.cmapSize);

    const width = this.properties.width;
    const height = this.properties.height;
    const is = width * height;
    const bpp = this.properties.bpp == 4 ? 4 : 8;
    const sizzled = !!(this.properties.format & 1);

    let amin = 255;
    let amax = 0;

    let rgba = new Uint8ClampedArray(is * 4);
    for (let i = 0; i < width * height; i++) {
      let ci = 0;
      if (bpp == 4) {
        ci = data.getUint8(Math.floor(i / 2));
        ci = i % 2 == 0 ? ci & 0xf : ci >> 4;
      } else {
        ci = data.getUint8(i);
      }
      amin = Math.min(ci, amin);
      amax = Math.max(ci, amax);
      rgba[i * 4 + 0] = cmap.getUint8(ci * 4 + 0);
      rgba[i * 4 + 1] = cmap.getUint8(ci * 4 + 1);
      rgba[i * 4 + 2] = cmap.getUint8(ci * 4 + 2);
      rgba[i * 4 + 3] = cmap.getUint8(ci + 4 + 3);
        //this.properties.alphaMode != 1 ? 255 : cmap.getUint8(ci + 4 + 3);
    }

    //console.log("indices min, max, bpp", amin, amax, bpp);
    if (sizzled) {
      const ch = 8;
      const cw = cmap.size == 64 ? 32 : 16;
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
    this.rgba = rgba;
  }

  override export(): Flat.Node {
    const ret: Flat.Node = {
      type: "TEXTURE",
      name: this.name,
      id: this.properties.id,
      width: this.properties.width,
      height: this.properties.height,
      bpp: this.properties.bpp,
      format: this.properties.format,
      alphaMode: this.properties.alphaMode,
      alphaTest: this.properties.alphaTest,
      diffuse: this.properties.diffuse,
      rgba: Array.from(this.rgba),
    };
    return ret;
  }
}
