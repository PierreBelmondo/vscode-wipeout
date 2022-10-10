import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class DdsModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<DdsModelDocument> {
    let array = new Uint8Array();
    if (uri.scheme !== "untitled")
      array = await vscode.workspace.fs.readFile(uri);
    const arraybuffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
    return new DdsModelDocument(uri, Buffer.from(arraybuffer), "image/dds");
  }
}
