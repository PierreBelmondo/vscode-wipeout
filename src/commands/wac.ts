import * as vscode from "vscode";
import * as path from "path";
import * as fs from 'fs';

import { Wac, WacFile } from "../../core/formats/wac";

export class WacUnpackCommandProvider {
  static readonly commandType = "wipeout.unpack.wac";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(WacUnpackCommandProvider.commandType, async (...files) => {
      for (const wacFilename of files as vscode.Uri[]) {
        const wacBasename = path.basename(wacFilename.path);
        const wadBasename = wacBasename.replace(".WAC", ".WAD");
        const wadFilename = vscode.Uri.joinPath(wacFilename, "../" + wadBasename);
        const dirname = vscode.Uri.joinPath(wacFilename, "..");

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Unpacking ${wacBasename}`,
            cancellable: false,
          },
          async (progress, token) => {
            progress.report({ increment: 0, message: "Loading file..." });

            const wacArray = await vscode.workspace.fs.readFile(wacFilename);
            const wacBuffer = wacArray.buffer.slice(wacArray.byteOffset, wacArray.byteOffset + wacArray.byteLength);

            const wac = Wac.load(wacBuffer);
            const wad = fs.openSync(wadFilename.fsPath, 'r');

            /*
            const wadBuffer = wacArray.buffer.slice(wadArray.byteOffset, wadArray.byteOffset + wadArray.byteLength);
            */

            const outfiles = wac.all;
            for (let i = 0; i < outfiles.length; i++) {
              const outfile = outfiles[i];
              const increment = Math.round(100.0 / outfiles.length);
              progress.report({ increment, message: `${outfile.path}` });
              await this.exportFile(dirname, outfile.path, outfile.file, wad);
            }
          }
        );
      }
    });
  }

  static toArrayBuffer(buf) {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }
    return ab;
  }

  static async exportFile(workdir: vscode.Uri, filename: string, wacFile: WacFile, wadFile: number) {
    const fileUri = vscode.Uri.joinPath(workdir, filename);
    const pathUri = vscode.Uri.joinPath(fileUri, "..");
    await vscode.workspace.fs.createDirectory(pathUri);
    const buffer = Buffer.alloc(wacFile.size);
    fs.readSync(wadFile, buffer, 0, wacFile.size, wacFile.offset);
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array(buffer));
  }
}
