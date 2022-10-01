import * as vscode from "vscode";
import { DDS } from "../../core/dds";
import { TextureModelDocument } from "./TextureModelDocument";

export class DdsModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<DdsModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
    console.log(buffer);
    const file = await DDS.load(buffer);
    const textures = file.export();
    return new DdsModelDocument(uri, buffer, textures);
  }
}
