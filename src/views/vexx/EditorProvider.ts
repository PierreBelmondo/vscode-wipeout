import * as vscode from "vscode";
import * as path from "path";

import { VexxDocument } from "./Document";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../helpers/dispose";
import { getNonce } from "../../helpers/util";
import { TextEncoder } from "util";

/**
 * Provider for VEXX model editors.
 *
 * VEXX model editors are used for `.vexx` files.
 */
export class VexxEditorProvider implements vscode.CustomReadonlyEditorProvider<VexxDocument> {
  private static readonly viewType = "wipeout.view.vexx";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(VexxEditorProvider.viewType, new VexxEditorProvider(context), {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    });
  }

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<VexxDocument> {
    const document: VexxDocument = await VexxDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  async resolveCustomEditor(document: VexxDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      switch (e.type) {
        case "ready":
          if (document.uri.scheme === "untitled") {
            console.log("empty document");
          } else {
            const filename = document.uri.path;
            const buffer = document.buffer.toString("base64");
            const body = { buffer, filename, mime: document.mime };
            console.log("sending file content to webview");
            this.postMessage(webviewPanel, "load", body);
          }
          break;
        case "require":
          let filename = e.filename;
          if (filename === ".rcsmodel") {
            filename = document.uri.path;
            filename = filename.replace(".vex", ".rcsmodel");
            filename = filename.replace(document.root.path, "");
          }
          console.log(`Document requires external dependency: ${filename}`);
          const buffer = await this.require(document, filename);
          const body = { buffer, filename };
          this.postMessage(webviewPanel, "import", body);
          break;
        case "log":
          console.log(e.message);
          break;
        case "export.gltf":
          const gltf = e.message.body;
          this.exportGLTF(document, gltf);
          return;
      }
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<VexxDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "dist", "webview-three.js"));
    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' http: https: data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RCS Model</title>
        </head>
        <body>
          <div id="app"></div>
          <script nonce="${nonce}" src="${uri}"></script>
        </body>
      </html>`;
  }

  private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
    panel.webview.postMessage({ type, body });
  }

  private async require(document: VexxDocument, filename: string) {
    const uriImport = vscode.Uri.joinPath(document.root, filename);
    const arrayTmp = await vscode.workspace.fs.readFile(uriImport);
    const arrayBuffer = arrayTmp.buffer.slice(arrayTmp.byteOffset, arrayTmp.byteOffset + arrayTmp.byteLength);
    return Buffer.from(arrayBuffer).toString("base64");
  }

  private exportGLTF(document: VexxDocument, gltf: any) {
    const json = JSON.stringify(gltf, null, "\t");
    const encoder = new TextEncoder();
    const array = encoder.encode(json);
    const filename = path.basename(document.uri.path) + ".gltf";
    const uri = vscode.Uri.joinPath(document.uri, "..", filename);
    vscode.workspace.fs.writeFile(uri, array);
  }
}
