import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class MipModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<MipModelDocument> {
    return new MipModelDocument(uri, "image/mip");
  }
}
