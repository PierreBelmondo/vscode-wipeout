import * as vscode from "vscode";
import * as path from "path";

import { Bnk, BnkWave } from "@core/formats/bnk";

// VAG (PS-ADPCM) file header: 48 bytes
// Standard format used by PS1/PS2/PSP for raw ADPCM audio.
function makeVagHeader(dataSize: number, sampleRate: number, name: string): Uint8Array {
  const header = new Uint8Array(48);
  const view = new DataView(header.buffer);

  // Magic "VAGp"
  header[0] = 0x56; header[1] = 0x41; header[2] = 0x47; header[3] = 0x70;
  // Version (big-endian)
  view.setUint32(4, 0x20, false);
  // Reserved
  view.setUint32(8, 0, false);
  // Data size (big-endian)
  view.setUint32(12, dataSize, false);
  // Sample rate (big-endian)
  view.setUint32(16, sampleRate, false);
  // Reserved x3
  view.setUint32(20, 0, false);
  view.setUint32(24, 0, false);
  view.setUint32(28, 0, false);
  // Name: up to 16 bytes, null-padded
  const nameBytes = new TextEncoder().encode(name.substring(0, 16));
  header.set(nameBytes, 32);

  return header;
}

export class BnkUnpackCommandProvider {
  static readonly commandType = "wipeout.unpack.bnk";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
      BnkUnpackCommandProvider.commandType,
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
            async (progress) => {
              progress.report({ increment: 0, message: "Loading file..." });

              const array = await vscode.workspace.fs.readFile(file);
              const buffer = array.buffer.slice(
                array.byteOffset,
                array.byteOffset + array.byteLength
              ) as ArrayBuffer;

              const bnk = Bnk.load(buffer);
              const outDir = vscode.Uri.joinPath(dirname, path.basename(file.path, path.extname(file.path)));
              await vscode.workspace.fs.createDirectory(outDir);

              const increment = Math.round(100.0 / bnk.waves.length);
              for (let i = 0; i < bnk.waves.length; i++) {
                const wave = bnk.waves[i];
                const name = `wave_${String(i).padStart(3, "0")}`;
                progress.report({ increment, message: `${name}.vag` });
                await BnkUnpackCommandProvider.exportWave(outDir, name, wave, bnk);
              }
            }
          );
        }
      }
    );
  }

  static async exportWave(outDir: vscode.Uri, name: string, wave: BnkWave, bnk: Bnk): Promise<void> {
    const audioRange = bnk.audioRange(wave);
    const adpcmData = new Uint8Array(audioRange.buffer);

    // Sample rate: 22050 Hz is standard for PS2/PSP SCREAM banks.
    // The pitch_id field encodes a SCREAM-internal value, not a direct Hz rate,
    // so we use 22050 as the default.
    const sampleRate = 22050;
    const vagHeader = makeVagHeader(adpcmData.byteLength, sampleRate, name);

    const out = new Uint8Array(vagHeader.byteLength + adpcmData.byteLength);
    out.set(vagHeader, 0);
    out.set(adpcmData, vagHeader.byteLength);

    const fileUri = vscode.Uri.joinPath(outDir, `${name}.vag`);
    await vscode.workspace.fs.writeFile(fileUri, out);
  }
}
