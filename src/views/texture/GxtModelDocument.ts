import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class GxtModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<GxtModelDocument> {
    return new GxtModelDocument(uri, "image/gxt");
  }
}
