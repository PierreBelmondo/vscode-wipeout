import { api } from "./api";

import { TextureViewMessage } from "@core/api/rpc";
import { Mipmaps } from "@core/utils/mipmaps";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";
import { BC7 } from "@core/utils/bcdec";

import { MIP } from "@core/formats/mip";
import { GNF } from "@core/formats/gnf";
import { GTF } from "@core/formats/gtf";
import { DDS } from "@core/formats/dds";
import { FNT } from "@core/formats/fnt";

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
      const p1 = (gray4[i] & 0b11110000) << 0;
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

  async load(buffer: ArrayBuffer, mime: string) {
    let mipmaps: Mipmaps = [];
    switch (mime) {
      case "image/mip":
        this.scaleY = 1;
        mipmaps = await this.loadMIP(buffer);
        break;
      case "image/gnf":
        mipmaps = await this.loadGNF(buffer);
        break;
      case "image/gtf":
        mipmaps = await this.loadGTF(buffer);
        break;
      case "image/dds":
        mipmaps = await this.loadDDS(buffer);
        break;
      case "font/fnt":
        mipmaps = await this.loadFNT(buffer);
        break;
    }
    mipmaps = await this.decompress(mipmaps);
    this.render(mipmaps);
  }

  async decompress(mipmaps: Mipmaps): Promise<Mipmaps> {
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
        case "BC7":
          console.log("Decompression BC7")
          uncompressedMipmaps.push({
            type: "RGBA",
            width: mipmap.width,
            height: mipmap.height,
            data: await BC7.decompress(mipmap.width, mipmap.height, mipmap.data.buffer),
          });
          break;
        default:
          console.log(`Compression mode ${mipmap.type} is not supported`);
      }
    }
    console.log(uncompressedMipmaps);
    return uncompressedMipmaps;
  }

  async loadMIP(buffer: ArrayBuffer): Promise<Mipmaps> {
    const mip = MIP.load(buffer);
    console.log(mip);
    return mip.mipmaps;
  }

  async loadGNF(buffer: ArrayBuffer): Promise<Mipmaps> {
    const gnf = GNF.load(buffer);
    console.log(gnf);
    return gnf.mipmaps;
  }

  async loadGTF(buffer: ArrayBuffer): Promise<Mipmaps> {
    const gtf = GTF.load(buffer);
    return gtf.mipmaps;
  }

  async loadDDS(buffer: ArrayBuffer): Promise<Mipmaps> {
    const dds = await DDS.load(buffer);
    return [];
  }

  async loadFNT(buffer: ArrayBuffer): Promise<Mipmaps> {
    this.scaleY = 1;
    const fnt = await FNT.load(buffer);
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
      canvas.style.maxWidth = "100%";
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

export async function main() {
  const app = window.document.querySelector("#app");
  if (!app) {
    console.error("Cannot find .app in document");
    return;
  }

  const editor = new Editor(app as HTMLElement);

  // Handle messages from the extension
  window.addEventListener("message", async (e) => {
    const { type, body } = e.data as TextureViewMessage;
    switch (type) {
      case "empty": {
        break;
      }
      case "load": {
        const mime = body.mime;
        const response = await fetch (body.webviewUri);
        const buffer = await response.arrayBuffer();
        editor.load(buffer, mime);
        break;
      }
    }
  });

  api.ready();
}
