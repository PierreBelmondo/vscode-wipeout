import * as vscode from "vscode";

import { Disposable } from "../../dispose";
import { Vexx } from "../../core/vexx";
import { Flat } from "../../core/vexx/flat";

/**
 * Define the document (the data model) used for paw draw files.
 */
export class VexxDocument
  extends Disposable
  implements vscode.CustomDocument
{
  static async create(uri: vscode.Uri): Promise<VexxDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const buffer = array.buffer.slice(
      array.byteOffset,
      array.byteOffset + array.byteLength
    );
    const vexx = Vexx.load(buffer);
    const scene = vexx.export();
    console.log(scene);
    return new VexxDocument(uri, buffer, scene);
  }

  private readonly _uri: vscode.Uri;

  private _buffer: ArrayBuffer;
  private _scene: Flat.Node;

  private constructor(uri: vscode.Uri, buffer: ArrayBuffer, scene: Flat.Node) {
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

  public get scene(): Flat.Node {
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
