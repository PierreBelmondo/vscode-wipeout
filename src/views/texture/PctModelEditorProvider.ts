import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { PctModelDocument } from "./PctModelDocument";
import { disposeAll } from "../../helpers/dispose";

export class PctModelEditorProvider extends TextureModelEditorProvider<PctModelDocument> {
  private static readonly viewType = "wipeout.view.pct";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(PctModelEditorProvider.viewType, new PctModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<PctModelDocument> {
    const document: PctModelDocument = await PctModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
