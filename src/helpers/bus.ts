import * as vscode from "vscode";
import { VexxDocument } from "views/vexx/Document";
import { ThreeViewMessage } from "../../core/api/rpc";

class Bus {
  private readonly _onDidChangeActiveCustomDocument = new vscode.EventEmitter<VexxDocument>();
  public readonly onDidChangeActiveCustomDocument = this._onDidChangeActiveCustomDocument.event;

  public fireDidChangeActiveCustomDocument(document: VexxDocument) {
    this._onDidChangeActiveCustomDocument.fire(document);
  }

  private readonly _onThreeViewMessage = new vscode.EventEmitter<ThreeViewMessage>();
  public readonly onThreeViewMessage = this._onThreeViewMessage.event;

  showWorld() {
    this._onThreeViewMessage.fire({ type: "show.world" });
  }

  showTexture(name: any) {
    this._onThreeViewMessage.fire({ type: "show.texture", body: { name } });
  }
}

export const bus = new Bus();
