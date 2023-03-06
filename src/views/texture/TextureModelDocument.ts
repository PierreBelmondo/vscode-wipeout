import * as vscode from "vscode";

import { Disposable } from "../../helpers/dispose";

/**
 * Define the document (the data model) used for texture files.
 */
export abstract class TextureModelDocument extends Disposable implements vscode.CustomDocument {
  private readonly _uri: vscode.Uri;

  private _mime: string;

  constructor(uri: vscode.Uri, mime: string) {
    super();
    this._uri = uri;
    this._mime = mime;
  }

  public get uri() {
    return this._uri;
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
