import * as vscode from "vscode";

import { TextureModelDocument } from "./TextureModelDocument";
import { WebviewCollection } from "../WebviewCollection";
import { getNonce } from "../../util";

/**
 * Provider for Texture editors.
 */
export abstract class TextureModelEditorProvider<TDM extends TextureModelDocument> implements vscode.CustomReadonlyEditorProvider<TDM> {
  /**
   * Tracks all known webviews
   */
  readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  abstract openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<TDM>;

  async resolveCustomEditor(document: TDM, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage((e) => {
      if (e.type === "ready") {
        if (document.uri.scheme === "untitled") {
          console.log("empty document");
        } else {
          console.log("sending textures to webview", document.textures);
          this.postMessage(webviewPanel, "load.textures", {
            textures: document.textures,
          });
        }
      }
      if (e.type === "log") {
        console.log(e.message);
      }
    });

    // Setup initial content for the webview
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<TDM>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "dist", "webview-texture.js"));
    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' http: https: data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Texture</title>
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
}
