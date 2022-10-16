import { vscode } from "../vscode";
import { Textures } from "../../core/utils/image";
import { GTF } from "../../core/gtf";
import { DDS } from "../../core/dds";

class Editor {
  ready: boolean;
  app: HTMLElement;

  constructor(app: HTMLElement) {
    this.ready = false;
    this.app = app;
  }

  async load(array: Uint8Array, mime: string) {
    let textures: Textures = [];
    switch (mime) {
      case "image/gtf":
        textures = await this.loadGTF(array);
        break;
      case "image/dds":
        textures = await this.loadDDS(array);
        break;
    }
    this.render(textures);
  }

  async loadGTF(array: Uint8Array): Promise<Textures> {
    const gtf = await GTF.load(array.buffer);
    return gtf.mipmaps;
  }

  async loadDDS(array: Uint8Array): Promise<Textures> {
    const dds = await DDS.load(array.buffer);
    return [];
  }

  render(textures: Textures) {
    for (const texture of textures) {
      const canvas = document.createElement("canvas");
      if (!canvas) {
        console.error("Cannot create canvas");
        break;
      }
      canvas.width = texture.width;
      canvas.height = texture.height;
      canvas.style.border = "1px solid white";
      canvas.style.transform = "scale(1, -1)";
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

  vscode.ready();
}
