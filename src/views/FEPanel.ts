import * as vscode from "vscode";

import { getNonce } from "../helpers/util";
import { ThreeViewMessage, ThreeViewMessageLoadBody } from "@core/api/rpc";

export class FEPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: FEPanel | undefined;

  static readonly viewType = "view.panel.fe";

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerWebviewPanelSerializer(FEPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
        FEPanel.revive(context, webviewPanel);
      },
    });
  }

  static revive(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    //FEPanel.currentPanel = new FEPanel(context, panel);
  }

  static readonly commandType = "wipeout.fe.preview";

  static registerCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(FEPanel.commandType, () => {
      FEPanel.show(context);
    });
  }

  static show(context: vscode.ExtensionContext) {
    if (FEPanel.currentPanel) {
      FEPanel.currentPanel.dispose();
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      vscode.commands.executeCommand("workbench.action.moveEditorToRightGroup");
      const column = editor.viewColumn || vscode.ViewColumn.One;
      const panel = vscode.window.createWebviewPanel(FEPanel.viewType, "FE Preview", column, {
        enableScripts: true,
      });
      FEPanel.currentPanel = new FEPanel(context, panel, editor.document.uri);
    }
  }

  private readonly _context: vscode.ExtensionContext;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _uri: vscode.Uri;

  private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, uri: vscode.Uri) {
    this._panel = panel;
    this._context = context;
    this._uri = uri;

    const webviewPanel = this._panel.webview;
    webviewPanel.html = this.getHtmlForWebview(webviewPanel);
    webviewPanel.onDidReceiveMessage((e) => {
      switch (e.type) {
        case "ready": {
          const webviewUri = webviewPanel.asWebviewUri(uri);
          /*
          const body = {
            mime: "application/xml+wipeout",
            uri: this._uri,
            webviewUri: webviewUri.toString(),
          } ;//as ThreeViewMessageLoadBody;
          webviewPanel.postMessage("import", body);
          */
          break;
        }
        case "log": {
          console.log(e.message);
          break;
        }
      }
    });

    this._panel.onDidDispose(() => this.dispose());
    this._panel.onDidChangeViewState((e) => {
      if (this._panel.visible) {
        // TODO
      }
    });
  }

  postMessage(message: ThreeViewMessage) {
    this._panel.webview.postMessage(message);
  }

  postMessageLoad(body: ThreeViewMessageLoadBody) {
    this.postMessage({ type: "load", body });
  }

  dispose() {
    FEPanel.currentPanel = undefined;
    this._panel.dispose();
  }

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
            <title>FE Preview</title>
        </head>
        <body>
            <div id="app"></div>
            <script nonce="${nonce}" src="${uri}"></script>
        </body>
        </html>`;
  }
}
