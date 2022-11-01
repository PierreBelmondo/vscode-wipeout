declare var acquireVsCodeApi: any;

const _vscode = acquireVsCodeApi();

class VSC {
  async ready() {
    _vscode.postMessage({ type: "ready" });
  }

  async require(filename: string) {
    _vscode.postMessage({ type: "require", filename });
  }

  async log(message: any) {
    _vscode.postMessage({ type: "log", message });
  }

  async exportGTLF(gltf: any) {
    _vscode.postMessage({ type: "export.gltf", body: gltf });
  }

  async scene(scene: any) {
    _vscode.postMessage({ type: "scene", body: scene });
  }
}

export const vscode = new VSC();
