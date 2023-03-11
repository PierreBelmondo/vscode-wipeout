import * as vscode from "vscode";
import * as path from "path";

import { RcsModelDocument } from "./Document";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../helpers/dispose";
import { getNonce } from "../../helpers/util";
import { TextEncoder } from "util";
import { ThreeViewMessageLoadBody } from "@core/api/rpc";

/**
 * Provider for RCS smodel editors.
 *
 * RCS model editors are used for `.rcsmodel` files.
 */
export class RcsModelEditorProvider implements vscode.CustomReadonlyEditorProvider<RcsModelDocument> {
  private static readonly viewType = "wipeout.view.rcsmodel";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(RcsModelEditorProvider.viewType, new RcsModelEditorProvider(context), {
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

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<RcsModelDocument> {
    const document: RcsModelDocument = await RcsModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  async resolveCustomEditor(document: RcsModelDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
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
            const webviewUri = webviewPanel.webview.asWebviewUri(document.uri);
            const body = {
              mime: document.mime,
              uri: document.uri.toString(),
              webviewUri: webviewUri.toString(),
            } as ThreeViewMessageLoadBody;
            console.log("sending file content to webview");
            this.postMessage(webviewPanel, "load", body);
          }
          break;
        case "require":
          const filename = e.filename;
          console.log(`Document requires external dependency: ${filename}`);
          const uri = await this.require(document, filename);
          const webviewUri = webviewPanel.webview.asWebviewUri(uri);
          const body = {
            mime: document.mime,
            uri: document.uri.toString(),
            webviewUri: webviewUri.toString(),
          } as ThreeViewMessageLoadBody;
          this.postMessage(webviewPanel, "import", body);
          break;
        case "log":
          console.log(e.message);
          break;
        case "export.gltf":
          const gltf = e.body;
          this.exportGLTF(document, gltf);
          return;
      }
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<RcsModelDocument>>();
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' http: https: data:; connect-src https:; font-src data:;">
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

  private async require(document: RcsModelDocument, filename: string) {
    return vscode.Uri.joinPath(document.root, filename);
  }

  private exportGLTF(document: RcsModelDocument, gltf: any) {
    const json = JSON.stringify(gltf, null, "\t");
    const encoder = new TextEncoder();
    const array = encoder.encode(json);
    const filename = path.basename(document.uri.path) + ".gltf";
    const uri = vscode.Uri.joinPath(document.uri, "..", filename);
    vscode.workspace.fs.writeFile(uri, array);
  }
}
