import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { DdsModelDocument } from "./DdsModelDocument";
import { disposeAll } from "../../dispose";

export class DdsModelEditorProvider extends TextureModelEditorProvider<DdsModelDocument> {
  private static readonly viewType = "wipeout.view.dds";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(DdsModelEditorProvider.viewType, new DdsModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<DdsModelDocument> {
    const document: DdsModelDocument = await DdsModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
