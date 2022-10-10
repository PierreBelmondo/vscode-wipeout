import * as vscode from "vscode";

import { Disposable } from "../../dispose";
import { Textures } from "../../../core/utils/image";

/**
 * Define the document (the data model) used for paw draw files.
 */
export abstract class TextureModelDocument extends Disposable implements vscode.CustomDocument {
  private readonly _uri: vscode.Uri;

  private _buffer: ArrayBuffer;
  private _textures: Textures;

  constructor(uri: vscode.Uri, buffer: ArrayBuffer, textures: Textures) {
    super();
    this._uri = uri;
    this._buffer = buffer;
    this._textures = textures;
  }

  public get uri() {
    return this._uri;
  }

  public get buffer(): ArrayBuffer {
    return this._buffer;
  }

  public get textures(): Textures {
    return this._textures;
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
