import * as vscode from "vscode";
import * as path from "path";

import { VexxDocument } from "./Document";
import { WebviewCollection } from "../WebviewCollection";
import { disposeAll } from "../../helpers/dispose";
import { getNonce } from "../../helpers/util";
import { bus } from "../../helpers/bus";
import { TextEncoder } from "util";
import { ThreeDocumentMessage, ThreeViewMessage, ThreeViewMessageImportBody, ThreeViewMessageLoadBody } from "@core/api/rpc";

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

  async openCustomDocument(uri: vscode.Uri, _openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<VexxDocument> {
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
    webviewPanel.webview.onDidReceiveMessage(async (e: ThreeDocumentMessage) => {

      // Forward each message to the bus
      bus.fireThreeDocumentMessage(e);

      // Interact with the Document
      switch (e.type) {
        case "ready":
          if (document.uri.scheme === "untitled") {
            console.log("empty document");
          } else {
            const webviewUri = webviewPanel.webview.asWebviewUri(document.uri);
            const body = {
              mime: document.mime,
              uri: document.uri.fsPath,
              webviewUri: webviewUri.toString(),
            } as ThreeViewMessageLoadBody;
            console.log("sending file content to webview");
            this.postMessage(webviewPanel, "load", body);
          }
          break;
        case "require":
          let filename = e.filename as string;
          let uri = this.resolveUri(document, filename);
          try {
            await vscode.workspace.fs.stat(uri);
            console.log(`Document requires external dependency: ${filename}`);
          } catch {
            // Case-insensitive fallback: first try filename-only, then full path walk
            let resolved = await this.resolveUriCaseInsensitive(uri);
            if (!resolved) {
              resolved = await this.resolvePathCaseInsensitive(document.root, filename);
            }
            if (resolved) {
              uri = resolved;
              console.log(`Document requires external dependency (case-insensitive): ${uri.fsPath}`);
            } else {
              console.log(`Document requires missing dependency: ${filename} ${uri}`);
              break;
            }
          }
          const webviewUri = webviewPanel.webview.asWebviewUri(uri);
          const body = {
            mime: "application/binary",
            uri: filename,
            webviewUri: webviewUri.toString(),
          } as ThreeViewMessageImportBody;
          this.postMessage(webviewPanel, "import", body);
          break;
        case "log":
          console.log(e.message);
          break;
        case "export.gltf":
          const gltf = e.body;
          this.exportGLTF(document, gltf);
          return;
        case "scene":
          document.scene = e.body;
          if (webviewPanel.active) {
            bus.fireDidChangeActiveCustomDocument(document);
          }
          break;
      }
    });

    bus.onThreeViewMessage((message: ThreeViewMessage) => {
      webviewPanel.webview.postMessage(message);
    });

    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        bus.fireDidChangeActiveCustomDocument(document);
      }
    });

    if (webviewPanel.active) {
      bus.fireDidChangeActiveCustomDocument(document);
    }
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: vscode-resource: https:; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src vscode-resource: 'unsafe-inline' http: https: data:; connect-src https: data:; font-src data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RCS Model</title>
        </head>
        <body>
          <div id="app"></div>
          <script nonce="${nonce}" src="${uri}"></script>
        </body>
      </html>`;
  }

  private postMessage(panel: vscode.WebviewPanel, type: string, body?: any): void {
    panel.webview.postMessage({ type, body });
  }

  private exportGLTF(document: VexxDocument, gltf: any) {
    const json = JSON.stringify(gltf, null, "\t");
    const encoder = new TextEncoder();
    const array = encoder.encode(json);
    const filename = path.basename(document.uri.path) + ".gltf";
    const uri = vscode.Uri.joinPath(document.uri, "..", filename);
    vscode.workspace.fs.writeFile(uri, array);
  }

  private resolveUri(document: VexxDocument, filename: string) {
    console.log(filename);
    if (filename.startsWith("data/")) {
      return vscode.Uri.joinPath(document.root, filename);
    }
    if (filename.startsWith("/")) {
      return vscode.Uri.parse(filename);
    }
    return vscode.Uri.joinPath(document.uri, "..", filename);
  }

  private async resolveUriCaseInsensitive(uri: vscode.Uri): Promise<vscode.Uri | null> {
    // First try: only match the filename (fast path for correct directory case)
    const dir = vscode.Uri.joinPath(uri, "..");
    const target = path.basename(uri.fsPath).toLowerCase();
    try {
      const entries = await vscode.workspace.fs.readDirectory(dir);
      for (const [name] of entries) {
        if (name.toLowerCase() === target) {
          return vscode.Uri.joinPath(dir, name);
        }
      }
    } catch {}
    return null;
  }

  /**
   * Walk each path segment case-insensitively from a base URI.
   * Returns the resolved URI or null if any segment is not found.
   */
  private async resolvePathCaseInsensitive(base: vscode.Uri, relativePath: string): Promise<vscode.Uri | null> {
    const segments = relativePath.split("/").filter(s => s.length > 0);
    let current = base;
    for (const seg of segments) {
      const target = seg.toLowerCase();
      try {
        const entries = await vscode.workspace.fs.readDirectory(current);
        const match = entries.find(([name]) => name.toLowerCase() === target);
        if (!match) return null;
        current = vscode.Uri.joinPath(current, match[0]);
      } catch {
        return null;
      }
    }
    return current;
  }
}


