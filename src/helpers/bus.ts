import * as vscode from "vscode";
import { VexxDocument } from "views/vexx/Document";
import { ThreeDocumentMessage, ThreeViewMessage } from "@core/api/rpc";

class Bus {
  private readonly _onDidChangeActiveCustomDocument = new vscode.EventEmitter<VexxDocument>();
  public readonly onDidChangeActiveCustomDocument = this._onDidChangeActiveCustomDocument.event;

  public fireDidChangeActiveCustomDocument(document: VexxDocument) {
    this._onDidChangeActiveCustomDocument.fire(document);
  }

  private readonly _onThreeDocumentMessage = new vscode.EventEmitter<ThreeDocumentMessage>();
  public readonly onThreeDocumentMessage = this._onThreeDocumentMessage.event;

  public fireThreeDocumentMessage(message: ThreeDocumentMessage) {
    this._onThreeDocumentMessage.fire(message);
  } 

  private readonly _onThreeViewMessage = new vscode.EventEmitter<ThreeViewMessage>();
  public readonly onThreeViewMessage = this._onThreeViewMessage.event;
 
  public fireThreeViewMessage(message: ThreeViewMessage) {
    this._onThreeViewMessage.fire(message);
  } 

  sceneRefreshEntry() {
    this.fireThreeViewMessage({ type: "scene.refresh" });
  }

  sceneSelectedEntry(uuid: string) {
    this.fireThreeViewMessage({ type: "scene.selected", body: { uuid } });
  }

  showWorld() {
    this.fireThreeViewMessage({ type: "show.world" });
  }

  showTexture(name: string) {
    this.fireThreeViewMessage({ type: "show.texture", body: { name } });
  }
}

export const bus = new Bus();
