declare var acquireVsCodeApi: any;

const _vscode = acquireVsCodeApi();

class VSC {
  // Signal to VS Code that the webview is initialized.
  ready() {
    _vscode.postMessage({ type: "ready" });
  }

  log(message: any) {
    _vscode.postMessage({ type: "log", message });
  }

  exportGTLF(gltf: any) {
    _vscode.postMessage({ type: "export.gltf", body: gltf });
  }
}

export const vscode = new VSC();
