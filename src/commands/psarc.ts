import * as vscode from "vscode";
import * as path from "path";

import { Psarc, PsarcFile } from "@core/formats/psarc";

export class PsarcUnpackCommandProvider {
  static readonly commandType = "wipeout.unpack.psarc";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      PsarcUnpackCommandProvider.commandType,
      async (...files) => {
        for (const file of files as vscode.Uri[]) {
          const basename = path.basename(file.path);
          const dirname = vscode.Uri.joinPath(file, "..");

          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Unpacking ${basename}`,
              cancellable: false,
            },
            async (progress, token) => {
              progress.report({ increment: 0, message: "Loading file..." });

              const array = await vscode.workspace.fs.readFile(file);
              const buffer = array.buffer.slice(
                array.byteOffset,
                array.byteOffset + array.byteLength
              ) as ArrayBuffer;

              const psarc = Psarc.load(buffer);
              const outfiles = psarc.files;
              for (let i = 0; i < outfiles.length; i++) {
                const outfile = outfiles[i];
                const increment = Math.round(100.0 / outfiles.length);
                progress.report({ increment, message: `${outfile.filename}` });
                await this.exportFile(dirname, outfile);
              }
            }
          );
        }
      }
    );
  }

  static toArrayBuffer(buf) {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }
    return ab;
  }

  static async exportFile(workdir: vscode.Uri, file: PsarcFile) {
    const fileUri = vscode.Uri.joinPath(workdir, file.filename);
    const pathUri = vscode.Uri.joinPath(fileUri, "..");
    await vscode.workspace.fs.createDirectory(pathUri);
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array(file.content));
  }
}

export class PsarcPackCommandProvider {
  static readonly commandType = "wipeout.pack.psarc";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      PsarcPackCommandProvider.commandType,
      (file) => {
        // TODO
      }
    );
  }
}
