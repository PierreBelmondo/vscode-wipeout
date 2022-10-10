import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class GtfModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<GtfModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const arraybuffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
    console.log(arraybuffer.byteLength)
    return new GtfModelDocument(uri, Buffer.from(arraybuffer), "image/gtf");
  }
}
