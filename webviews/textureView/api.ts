import * as vscode from "../vscode";

class API {
  ready() {
    vscode.postMessage({ type: "ready" });
  }
}

export const api = new API();
