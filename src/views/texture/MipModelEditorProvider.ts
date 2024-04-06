import * as vscode from "vscode";

import { TextureModelEditorProvider } from "./TextureModelEditorProvider";
import { MipModelDocument } from "./MipModelDocument";
import { disposeAll } from "../../helpers/dispose";

export class MipModelEditorProvider extends TextureModelEditorProvider<MipModelDocument> {
  private static readonly viewType = "wipeout.view.mip";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(MipModelEditorProvider.viewType, new MipModelEditorProvider(context), {
      webviewOptions: {},
      supportsMultipleEditorsPerDocument: false,
    });
  }

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<MipModelDocument> {
    const document: MipModelDocument = await MipModelDocument.create(uri);
    const listeners: vscode.Disposable[] = [];
    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }
}
