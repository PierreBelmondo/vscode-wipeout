import * as vscode from "vscode";

import { PobDocument } from "./Document";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../helpers/dispose";
import { getNonce } from "../../helpers/util";
import { bus } from "../../helpers/bus";
import { ThreeViewMessage, ThreeViewMessageImportBody, ThreeViewMessageLoadBody } from "@core/api/rpc";

/**
 * Provider for .pob (particle system) editors.
 *
 * Opens the system on its own in the three.js webview -- the same webview the
 * .vex and .rcsmodel editors use -- rather than inside a track. See
 * webviews/threeView/loaders/POBLoader.ts for what is drawn.
 */
export class PobEditorProvider implements vscode.CustomReadonlyEditorProvider<PobDocument> {
  private static readonly viewType = "wipeout.view.pob";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(PobEditorProvider.viewType, new PobEditorProvider(context), {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    });
  }

  private readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri, _openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<PobDocument> {
    const document = await PobDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  async resolveCustomEditor(document: PobDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    this.webviews.add(document.uri, webviewPanel);

    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      bus.fireThreeDocumentMessage(e);

      switch (e.type) {
        case "ready": {
          const webviewUri = webviewPanel.webview.asWebviewUri(document.uri);
          const body = {
            mime: document.mime,
            uri: document.uri.toString(),
            webviewUri: webviewUri.toString(),
          } as ThreeViewMessageLoadBody;
          this.postMessage(webviewPanel, "load", body);
          break;
        }
        case "require": {
          // Same contract as the other editors: EXACTLY one reply, always --
          // the webview awaits it. See the vexx provider for why.
          const filename = e.filename as string;
          try {
            const uri = await this.resolveUriCaseInsensitive(document, filename);
            await vscode.workspace.fs.stat(uri);
            const body = {
              mime: "application/binary",
              uri: filename,
              webviewUri: webviewPanel.webview.asWebviewUri(uri).toString(),
              id: e.id,
            } as ThreeViewMessageImportBody;
            this.postMessage(webviewPanel, "import", body);
          } catch (err) {
            console.log(`Particle system requires missing dependency: ${filename} (${err})`);
            if (e.id !== undefined) {
              this.postMessage(webviewPanel, "import.error", { uri: filename, reason: "file not found", id: e.id });
            }
          }
          break;
        }
        case "scene":
          document.scene = e.body;
          if (webviewPanel.active) {
            bus.fireDidChangeActiveCustomDocument(document);
          }
          break;
        case "log":
          console.log(e.message);
          break;
      }
    });

    bus.onThreeViewMessage((message: ThreeViewMessage) => {
      webviewPanel.webview.postMessage(message);
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<PobDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  private getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "dist", "webview-three.js"));
    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src vscode-resource: 'unsafe-inline' http: https: data:; connect-src https: data:; font-src data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Particle System</title>
        </head>
        <body>
          <div id="app"></div>
          <script nonce="${nonce}" src="${uri}"></script>
        </body>
      </html>`;
  }

  /**
   * Resolve a `data/...` path against the document's data root, or a bare name
   * against the document's own directory, matching each segment
   * case-insensitively -- the names inside the files do not always match the
   * case on disk.
   */
  private async resolveUriCaseInsensitive(document: PobDocument, filename: string): Promise<vscode.Uri> {
    let base: vscode.Uri;
    if (filename.toLowerCase().startsWith("data/")) {
      base = document.root;
    } else if (filename.startsWith("/")) {
      return vscode.Uri.parse(filename);
    } else {
      base = vscode.Uri.joinPath(document.uri, "..");
    }

    let current = base;
    for (const seg of filename.split("/")) {
      const segLower = seg.toLowerCase();
      try {
        const entries = await vscode.workspace.fs.readDirectory(current);
        const match = entries.find(([name]) => name.toLowerCase() === segLower);
        current = vscode.Uri.joinPath(current, match ? match[0] : seg);
      } catch {
        current = vscode.Uri.joinPath(current, seg);
      }
    }
    return current;
  }

  private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
    panel.webview.postMessage({ type, body });
  }
}
