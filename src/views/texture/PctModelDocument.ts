import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class PctModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<PctModelDocument> {
    return new PctModelDocument(uri, "image/pct");
  }
}
