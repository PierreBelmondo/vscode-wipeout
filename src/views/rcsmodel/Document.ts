import * as vscode from "vscode";

import { Disposable } from "../../dispose";
import { Rcsmodel } from "../../core/rcs";
import { Scene } from "../../core/rcs/types";

/**
 * Define the document (the data model) used for paw draw files.
 */
export class RcsModelDocument
  extends Disposable
  implements vscode.CustomDocument
{
  static async create(uri: vscode.Uri): Promise<RcsModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const buffer = array.buffer.slice(array.byteOffset, array.byteOffset+array.byteLength);
    const rcs = Rcsmodel.load(buffer);
    const scene = rcs.export();
    return new RcsModelDocument(uri, buffer, scene);
  }

  private readonly _uri: vscode.Uri;

  private _buffer: ArrayBuffer;
  private _scene: Scene;

  private constructor(uri: vscode.Uri, buffer: ArrayBuffer, scene: Scene) {
    super();
    this._uri = uri;
    this._buffer = buffer;
    this._scene = scene;
  }

  public get uri() {
    return this._uri;
  }

  public get buffer(): ArrayBuffer {
    return this._buffer;
  }

  public get scene(): Scene {
    return this._scene;
  }

  private readonly _onDidDispose = this._register(
    new vscode.EventEmitter<void>()
  );

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
