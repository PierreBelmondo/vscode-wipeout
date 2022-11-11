import { api } from "./api";

import { Mipmaps } from "../../core/utils/mipmaps";
import { DXT1, DXT3, DXT5 } from "../../core/utils/dxt";

import { GTF } from "../../core/gtf";
import { DDS } from "../../core/dds";
import { FNT } from "../../core/fnt";

class ARGB {
  static convert(argb: Uint8Array | Uint8ClampedArray) {
    const data = new Uint8Array(argb.length);
    for (let i = 0; i < argb.length / 4; i++) {
      data[i * 4 + 0] = argb[i * 4 + 1];
      data[i * 4 + 1] = argb[i * 4 + 2];
      data[i * 4 + 2] = argb[i * 4 + 3];
      data[i * 4 + 3] = argb[i * 4 + 0];
    }
    return data;
  }
}

class Gray4 {
  static convert(gray4: Uint8Array | Uint8ClampedArray) {
    const data = new Uint8Array(gray4.length * 2 * 4);
    for (let i = 0; i < gray4.length; i++) {
      const p1 = (gray4[i] & 0b11110000);
      const p2 = (gray4[i] & 0b00001111) << 4;
      data[i * 8 + 0] = p2;
      data[i * 8 + 1] = p2;
      data[i * 8 + 2] = p2;
      data[i * 8 + 3] = 255;
      data[i * 8 + 4] = p1;
      data[i * 8 + 5] = p1;
      data[i * 8 + 6] = p1;
      data[i * 8 + 7] = 255;
    }
    return data;
  }
}

class Editor {
  app: HTMLElement;

  scaleX = 1;
  scaleY = -1;

  constructor(app: HTMLElement) {
    this.app = app;
  }

  async load(array: Uint8Array, mime: string) {
    let mipmaps: Mipmaps = [];
    switch (mime) {
      case "image/gtf":
        mipmaps = await this.loadGTF(array);
        break;
      case "image/dds":
        mipmaps = await this.loadDDS(array);
        break;
      case "font/fnt":
        mipmaps = await this.loadFNT(array);
        break;
    }
    console.log(mipmaps);
    mipmaps = this.decompress(mipmaps);
    this.render(mipmaps);
  }

  decompress(mipmaps: Mipmaps): Mipmaps {
    const uncompressedMipmaps: Mipmaps = [];
    for (const mipmap of mipmaps) {
      switch (mipmap.type) {
        case "Gray4":
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: Gray4.convert(mipmap.data),
          });
          break;
        case "RGBA":
          uncompressedMipmaps.push(mipmap);
          break;
        case "ARGB":
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: ARGB.convert(mipmap.data),
          });
          break;
        case "DXT1":
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: DXT1.decompress(mipmap.width, mipmap.height, mipmap.data.buffer),
          });
          break;
        case "DXT3":
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: DXT3.decompress(mipmap.width, mipmap.height, mipmap.data.buffer),
          });
          break;
        case "DXT5":
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: DXT5.decompress(mipmap.width, mipmap.height, mipmap.data.buffer),
          });
          break;
        default:
          console.log(`Compression mode ${mipmap.type} is not supported`);
      }
    }
    console.log(uncompressedMipmaps);
    return uncompressedMipmaps;
  }

  async loadGTF(array: Uint8Array): Promise<Mipmaps> {
    const gtf = await GTF.load(array.buffer);
    return gtf.mipmaps;
  }

  async loadDDS(array: Uint8Array): Promise<Mipmaps> {
    const dds = await DDS.load(array.buffer);
    return [];
  }

  async loadFNT(array: Uint8Array): Promise<Mipmaps> {
    this.scaleY = 1;
    const fnt = await FNT.load(array.buffer);
    return [fnt.image.mipmap];
  }

  render(textures: Mipmaps) {
    for (const texture of textures) {
      const canvas = document.createElement("canvas");
      if (!canvas) {
        console.error("Cannot create canvas");
        break;
      }
      canvas.width = texture.width;
      canvas.height = texture.height;
      canvas.style.border = "1px solid white";
      canvas.style.transform = `scale(${this.scaleX}, ${this.scaleY})`;
      canvas.style.margin = "10px";
      canvas.style.backgroundColor = "#000000";
      this.app.append(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.log("Error cannot get canvas 2D context");
        return new Image();
      }

      const idata = ctx.createImageData(texture.width, texture.height);
      idata.data.set(texture.data);
      ctx.putImageData(idata, 0, 0);
    }
  }
}

export function main() {
  const app = window.document.querySelector("#app");
  if (!app) {
    console.error("Cannot find .app in document");
    return;
  }

  const editor = new Editor(app as HTMLElement);

  // Handle messages from the extension
  window.addEventListener("message", async (e) => {
    const { type, body } = e.data;
    switch (type) {
      case "load": {
        const mime = body.mime;
        const array = Uint8Array.from(window.atob(body.buffer), (v) => v.charCodeAt(0));
        editor.load(array, mime);
      }
    }
  });

  api.ready();
}
