import * as fs from "fs";
import * as path from "path";

import { Command } from "commander";
import { Psarc } from "@core/formats/psarc";

function toArrayBuffer(buffer: Buffer) {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

function findPsarcFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPsarcFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".psarc")) {
      results.push(fullPath);
    }
  }
  return results;
}

const program = new Command();

program
  .name("psarc")
  .description("WipEout PSARC archive tool");

program
  .command("scan")
  .description("Scan ../project-example/ for PSARC files and print their contents")
  .action(() => {
    const root = "../project-example/";
    const psarcFiles = findPsarcFiles(root);

    for (const filename of psarcFiles) {
      console.log(`\n=== ${filename} ===`);
      try {
        const buffer = fs.readFileSync(filename);
        const arraybuffer = toArrayBuffer(buffer);
        const psarc = Psarc.load(arraybuffer);
        console.log(`  version=${psarc.version} entries=${psarc.toc_entries}`);
        // files[0] is the manifest, skip it
        for (const file of psarc.files.slice(1)) {
          console.log(`  File ${file.filename} (${file.size} bytes)`);
        }
      } catch (e) {
        console.log(`  Error: ${e}`);
      }
    }
  });

function extractPsarc(psarcPath: string) {
  const outDir = path.dirname(psarcPath);
  const buffer = fs.readFileSync(psarcPath);
  const arraybuffer = toArrayBuffer(buffer);
  const psarc = Psarc.load(arraybuffer);
  // files[0] is the manifest, skip it
  const dataFiles = psarc.files.slice(1);
  console.log(`Extracting ${dataFiles.length} files from ${psarcPath}`);
  for (const entry of dataFiles) {
    const outPath = path.join(outDir, entry.filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const content = Buffer.from(entry.content);
    fs.writeFileSync(outPath, content);
    console.log(`  ${entry.filename} (${content.length} bytes)`);
  }
}

program
  .command("extract")
  .description("Extract a PSARC file into the directory where it resides")
  .argument("<file>", "Path to the .psarc file")
  .action((file: string) => {
    extractPsarc(path.resolve(file));
  });

program
  .command("extract-all")
  .description("Extract all PSARC files found under a directory (default: ../project-example/)")
  .argument("[dir]", "Root directory to search", "../project-example/")
  .action((dir: string) => {
    const psarcFiles = findPsarcFiles(dir);
    for (const psarcPath of psarcFiles) {
      try {
        extractPsarc(path.resolve(psarcPath));
      } catch (e) {
        console.error(`  Skipping ${psarcPath}: ${e}`);
      }
    }
  });

program.parse();
