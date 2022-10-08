import * as vscode from "vscode";

import { Disposable } from "../../dispose";
import { Scene } from "../../core/rcs/types";
import { RcsModel } from "../../core/rcs";
import { RcsMaterial } from "../../core/rcs/material";
import { GTF } from "../../core/gtf";

/**
 * Define the document (the data model) used for RcsModel files.
 */
export class RcsModelDocument extends Disposable implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<RcsModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled") array = await vscode.workspace.fs.readFile(uri);
    const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);

    const textureCache: { [id: string]: GTF } = {};

    const root = RcsModelDocument.findDataRoot(uri);
    console.log(`Found root of data in ${root.path}`);

    const model = RcsModel.load(buffer);
    for (const material of model.materials) {
      console.log(`Loading material (${material.id.toString(16)}) ${material.filename}`);
      /*
      const uriMaterial = vscode.Uri.joinPath(root, material.filename);
      const arrayMaterial = await vscode.workspace.fs.readFile(uriMaterial);
      const bufferMaterial = arrayMaterial.buffer.slice(arrayMaterial.byteOffset, arrayMaterial.byteOffset + arrayMaterial.byteLength);
      RcsMaterial.load(bufferMaterial);
      */
      for (const texture of material.textures) {
        if (texture.type == 0x8001 && texture.filename != "") {
          if (!(texture.filename in textureCache)) {
            console.log(`Loading texture (${texture.id.toString(16)}) ${texture.filename}`);
            const uriTexture = vscode.Uri.joinPath(root, texture.filename);
            const arrayTexture = await vscode.workspace.fs.readFile(uriTexture);
            const bufferTexture = arrayTexture.buffer.slice(arrayTexture.byteOffset, arrayTexture.byteOffset + arrayTexture.byteLength);
            const gtf = await GTF.load(bufferTexture);
            textureCache[texture.filename] = gtf;
          }
          texture.gtf = textureCache[texture.filename];
        } else {
          console.log(`Loading texture (${texture.id.toString(16)}) failed`);
        }
      }
    }

    const scene = model.export();
    return new RcsModelDocument(uri, model, scene);
  }

  static findDataRoot(uri: vscode.Uri) {
    let tmpUri = vscode.Uri.from(uri);
    while (!tmpUri.path.toLowerCase().endsWith("data")) {
      tmpUri = vscode.Uri.joinPath(tmpUri, "..");
      console.log(tmpUri.path);
    }
    return vscode.Uri.joinPath(tmpUri, "..");
  }

  private readonly _uri: vscode.Uri;

  private _model: RcsModel;
  private _scene: Scene;

  private constructor(uri: vscode.Uri, buffer: RcsModel, scene: Scene) {
    super();
    this._uri = uri;
    this._model = buffer;
    this._scene = scene;
  }

  public get uri() {
    return this._uri;
  }

  public get model(): RcsModel {
    return this._model;
  }

  public get scene(): Scene {
    return this._scene;
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
