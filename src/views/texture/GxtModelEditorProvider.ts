import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { GxtModelDocument } from "./GxtModelDocument";
import { disposeAll } from "../../helpers/dispose";

export class GxtModelEditorProvider extends TextureModelEditorProvider<GxtModelDocument> {
  private static readonly viewType = "wipeout.view.gxt";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(GxtModelEditorProvider.viewType, new GxtModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<GxtModelDocument> {
    const document: GxtModelDocument = await GxtModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
