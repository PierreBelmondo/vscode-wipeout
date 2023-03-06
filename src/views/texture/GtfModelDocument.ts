import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class GtfModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<GtfModelDocument> {
    return new GtfModelDocument(uri, "image/gtf");
  }
}
