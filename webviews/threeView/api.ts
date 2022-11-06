import * as vscode from "../vscode";

class API {
  ready() {
    vscode.postMessage({ type: "ready" });
  }

  require(filename: string) {
    vscode.postMessage({ type: "require", filename });
  }

  log(message: any) {
    vscode.postMessage({ type: "log", message });
  }

  exportGTLF(gltf: any) {
    vscode.postMessage({ type: "export.gltf", body: gltf });
  }

  scene(scene: any) {
    vscode.postMessage({ type: "scene", body: scene });
  }
}

export const api = new API();
