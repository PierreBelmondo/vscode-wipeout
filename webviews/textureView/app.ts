import { vscode } from "../vscode";

import { Textures } from "../../src/core/utils/image";

class Editor {
  ready: boolean;
  app: HTMLElement;

  constructor(app: HTMLElement) {
    this.ready = false;
    this.app = app;
  }

  load(textures: Textures) {

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
      idata.data.set(texture.rgba);
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
      case "load.textures": {
        const textures = body.textures as Textures;
        editor.load(textures)
      }
    }
  });

  vscode.ready();
}
