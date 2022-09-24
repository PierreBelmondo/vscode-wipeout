import * as vscode from "vscode";
import * as path from "path";

import { RcsModelDocument } from "./Document";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../dispose";
import { getNonce } from "../../util";
import { TextEncoder } from "util";

/**
 * Provider for RCS smodel editors.
 *
 * RCS model editors are used for `.rcsmodel` files.
 */
export class RcsModelEditorProvider
  implements vscode.CustomReadonlyEditorProvider<RcsModelDocument>
{
  private static readonly viewType = "wipeout.view.rcsmodel";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      RcsModelEditorProvider.viewType,
      new RcsModelEditorProvider(context),
      {
        webviewOptions: {},
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<RcsModelDocument> {
    const document: RcsModelDocument = await RcsModelDocument.create(uri);

    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  async resolveCustomEditor(
    document: RcsModelDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage((e) =>
      this.onMessage(document, e)
    );

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage((e) => {
      if (e.type === "ready") {
        if (document.uri.scheme === "untitled") {
          console.log("empty document");
        } else {
          console.log("sending scene to webview", document.scene, 2);
          this.postMessage(webviewPanel, "load.rcsmodel", {
            scene: document.scene,
          });
        }
      }
      if (e.type == "clipboard") {
        console.log(e.body);
        /*
        const item = new ClipboardItem(e.body);
        clipboard.write([item]);
        */
      }
      if (e.type === "log") {
        console.log(e.message);
      }
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<RcsModelDocument>
  >();
  public readonly onDidChangeCustomDocument =
    this._onDidChangeCustomDocument.event;

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    const uri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        "dist",
        "webview-three.js"
      )
    );

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

  private postMessage(
    panel: vscode.WebviewPanel,
    type: string,
    body: any
  ): void {
    panel.webview.postMessage({ type, body });
  }

  private onMessage(document: RcsModelDocument, message: any) {
    switch (message.type) {
      case "ready":
        return;
      case "export.gltf":
        const gltf = message.body;
        this.exportGLTF(document, gltf);
        return;
    }
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
