import * as vscode from "vscode";

import { Disposable } from "../../helpers/dispose";

/**
 * The document behind a .pob (particle system) editor.
 *
 * `root` is the directory holding `data/`, so the webview's `require` of a
 * `data/psys/tex/<name>.gtf` -- how PS3 systems reference their sprites --
 * resolves against the same tree the .pob came from.
 */
export class PobDocument extends Disposable implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<PobDocument> {
    return new PobDocument(uri, "model/vnd.wipeout.pob");
  }

  static findDataRoot(uri: vscode.Uri) {
    let tmpUri = vscode.Uri.from(uri);
    while (!tmpUri.path.toLowerCase().endsWith("data")) {
      const parent = vscode.Uri.joinPath(tmpUri, "..");
      // Stop at the filesystem root rather than looping forever on a file
      // that is not under a data/ directory at all.
      if (parent.path === tmpUri.path) return tmpUri;
      tmpUri = parent;
    }
    return vscode.Uri.joinPath(tmpUri, "..");
  }

  public scene: any = {};

  private readonly _uri: vscode.Uri;
  private _root: vscode.Uri;
  private _mime: string;

  constructor(uri: vscode.Uri, mime: string) {
    super();
    this._uri = uri;
    this._root = PobDocument.findDataRoot(uri);
    this._mime = mime;
  }

  public get uri() {
    return this._uri;
  }

  public get root() {
    return this._root;
  }

  public get mime(): string {
    return this._mime;
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());

  /** Fired when the document is disposed of. */
  public readonly onDidDispose = this._onDidDispose.event;

  dispose(): void {
    this._onDidDispose.fire();
    super.dispose();
  }
}
