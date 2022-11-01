import * as vscode from "vscode";
import { VexxDocument } from "views/vexx/Document";

class Bus {
  private readonly _onDidChangeActiveCustomDocument = new vscode.EventEmitter<VexxDocument>();

  public readonly onDidChangeActiveCustomDocument = this._onDidChangeActiveCustomDocument.event;

  public fireDidChangeActiveCustomDocument(document: VexxDocument) {
    this._onDidChangeActiveCustomDocument.fire(document);
  }
}

export const bus = new Bus();
