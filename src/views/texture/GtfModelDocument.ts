import * as vscode from "vscode";
import { GTF } from "../../../core/gtf";
import { TextureModelDocument } from "./TextureModelDocument";

export class GtfModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<GtfModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
    const file = await GTF.load(buffer);
    const textures = file.export();
    return new GtfModelDocument(uri, buffer, textures);
  }
}
