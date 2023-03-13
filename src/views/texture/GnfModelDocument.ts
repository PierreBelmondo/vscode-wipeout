import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class GnfModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<GnfModelDocument> {
    return new GnfModelDocument(uri, "image/gnf");
  }
}
