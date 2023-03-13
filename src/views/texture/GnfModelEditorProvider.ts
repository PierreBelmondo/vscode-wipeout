import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { GnfModelDocument } from "./GnfModelDocument";
import { disposeAll } from "../../helpers/dispose";

export class GnfModelEditorProvider extends TextureModelEditorProvider<GnfModelDocument> {
  private static readonly viewType = "wipeout.view.gnf";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(GnfModelEditorProvider.viewType, new GnfModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<GnfModelDocument> {
    const document: GnfModelDocument = await GnfModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
