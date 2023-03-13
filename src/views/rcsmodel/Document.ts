import * as vscode from "vscode";

import { Disposable } from "../../helpers/dispose";

/**
 * Define the document (the data model) used for RcsModel files.
 */
export class RcsModelDocument extends Disposable implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<RcsModelDocument> {
    return new RcsModelDocument(uri, "model/vnd.wipeout.rcsmodel");
  }

  static findDataRoot(uri: vscode.Uri) {
    let tmpUri = vscode.Uri.from(uri);
    while (!tmpUri.path.toLowerCase().endsWith("data")) {
      tmpUri = vscode.Uri.joinPath(tmpUri, "..");
    }
    return vscode.Uri.joinPath(tmpUri, "..");
  }

  private readonly _uri: vscode.Uri;

  private _root: vscode.Uri;
  private _mime: string;

  constructor(uri: vscode.Uri, mime: string) {
    super();
    this._uri = uri;
    this._root = RcsModelDocument.findDataRoot(uri);
    this._mime = mime;
  }

  public get uri() {
    return this._uri;
  }

  public get root() {
    return this._root;
  }

  public get mime(): string {
    return this._mime;
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());

  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = this._register(
    new vscode.EventEmitter<{
      readonly content?: Uint8Array;
    }>()
  );

  /**
   * Called by VS Code when there are no more references to the document.
   *
   * This happens when all editors for it have been closed.
   */
  dispose(): void {
    this._onDidDispose.fire();
    super.dispose();
  }
}
