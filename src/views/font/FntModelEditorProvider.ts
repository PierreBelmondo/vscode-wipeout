import * as vscode from "vscode";

import { FntModelDocument } from "./FntModelDocument";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../helpers/dispose";
import { getNonce } from "../../helpers/util";
import { TextureViewMessageLoadBody } from "@core/api/rpc";

/**
 * Provider for Fnt editors.
 */
export class FntModelEditorProvider implements vscode.CustomReadonlyEditorProvider<FntModelDocument> {
  private static readonly viewType = "wipeout.view.fnt";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(FntModelEditorProvider.viewType, new FntModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<FntModelDocument> {
    const document = await FntModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  /**
   * Tracks all known webviews
   */
  readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  async resolveCustomEditor(document: FntModelDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage((e) => {
      if (e.type === "ready") {
        if (document.uri.scheme === "untitled") {
          console.log("empty document");
        } else {
          const webviewUri = webviewPanel.webview.asWebviewUri(document.uri);
          const body = {
            mime: document.mime,
            uri: document.uri.toString(),
            webviewUri: webviewUri.toString(),
          } as TextureViewMessageLoadBody;
          console.log("sending file content to webview");
          this.postMessage(webviewPanel, "load", body);
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

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<FntModelDocument>>();
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; connect-src data: https:; worker-src blob:; style-src vscode-resource: 'unsafe-inline' http: https: data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fnt</title>
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
