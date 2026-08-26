import * as vscode from "../vscode";

class API {
  ready() {
    vscode.postMessage({ type: "ready" });
  }

  require(filename: string) {
    vscode.postMessage({ type: "require", filename });
  }

  log(message: any) {
    // Mirrored to the webview console: the postMessage bridge drops lines under
    // load -- pick diagnostics repeatedly arrived truncated a few lines in --
    // and the console never does.
    console.log(message);
    vscode.postMessage({ type: "log", message });
  }

  exportGTLF(gltf: any) {
    vscode.postMessage({ type: "export.gltf", body: gltf });
  }

  scene(scene: any) {
    vscode.postMessage({ type: "scene", body: scene });
  }

  sceneSelected(uuid: string) {
    vscode.postMessage({ type: "scene.selected", body: { uuid } });
  }
}

export const api = new API();
