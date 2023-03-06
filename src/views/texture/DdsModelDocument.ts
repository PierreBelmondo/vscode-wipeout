import * as vscode from "vscode";
import { TextureModelDocument } from "./TextureModelDocument";

export class DdsModelDocument extends TextureModelDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<DdsModelDocument> {
    return new DdsModelDocument(uri, "image/dds");
  }
}
