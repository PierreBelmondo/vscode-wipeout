import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { GtfModelDocument } from "./GtfModelDocument";
import { disposeAll } from "../../dispose";

export class GtfModelEditorProvider extends TextureModelEditorProvider<GtfModelDocument> {
  private static readonly viewType = "wipeout.view.gtf";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(GtfModelEditorProvider.viewType, new GtfModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<GtfModelDocument> {
    const document: GtfModelDocument = await GtfModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
