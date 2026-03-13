import * as fs from "fs";
import * as path from "path";

import { Command } from "commander";
import { Wad } from "@core/formats/wad";

function toArrayBuffer(buffer: Buffer) {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

function findWadFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findWadFiles(fullPath));
    } else if (entry.isFile() && entry.name.toUpperCase().endsWith(".WAD")) {
      results.push(fullPath);
    }
  }
  return results;
}

const program = new Command();

program
  .name("wad")
  .description("WipEout WAD archive tool");

program
  .command("scan")
  .description("Scan ../project-example/ for WAD files and print their contents")
  .action(() => {
    const root = "../project-example/";
    const wadFiles = findWadFiles(root);

    for (const filename of wadFiles) {
      console.log(`\n=== ${filename} ===`);
      try {
        const buffer = fs.readFileSync(filename);
        const arraybuffer = toArrayBuffer(buffer);
        const wad = Wad.load(arraybuffer);
        console.log(`  version=${wad.version} count=${wad.count}`);
        for (const file of wad.files) {
          if (file.compressed) {
            console.log(`  File ${file.filename}`);
            console.log(`    Compressed: ${file.compressed}`);
            console.log(`    ${file.sizeCompressed} => ${file.sizeUncompressed} / ${file.content.byteLength}`);
            console.log(`    Valid: ${(file.sizeUncompressed & 0x7fffffff) == file.content.byteLength}`);
          } else {
            console.log(`  File ${file.filename} (${file.sizeUncompressed} bytes)`);
          }
        }
      } catch (e) {
        console.log(`  Error: ${e}`);
      }
    }
  });

program
  .command("extract")
  .description("Extract a WAD file into the directory where it resides")
  .argument("<file>", "Path to the .WAD file")
  .action((file: string) => {
    const wadPath = path.resolve(file);
    const outDir = path.dirname(wadPath);

    const buffer = fs.readFileSync(wadPath);
    const arraybuffer = toArrayBuffer(buffer);
    const wad = Wad.load(arraybuffer);

    console.log(`Extracting ${wad.count} files from ${wadPath} to ${outDir}`);

    for (const entry of wad.files) {
      const outPath = path.join(outDir, entry.filename);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const content = Buffer.from(entry.content);
      fs.writeFileSync(outPath, content);
      console.log(`  ${entry.filename} (${content.length} bytes)`);
    }
  });

function extractWad(wadPath: string) {
  const outDir = path.dirname(wadPath);
  const buffer = fs.readFileSync(wadPath);
  const arraybuffer = toArrayBuffer(buffer);
  const wad = Wad.load(arraybuffer);
  console.log(`Extracting ${wad.count} files from ${wadPath}`);
  for (const entry of wad.files) {
    const outPath = path.join(outDir, entry.filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const content = Buffer.from(entry.content);
    fs.writeFileSync(outPath, content);
    console.log(`  ${entry.filename} (${content.length} bytes)`);
  }
}

program
  .command("extract-all")
  .description("Extract all WAD files found under a directory (default: ../project-example/)")
  .argument("[dir]", "Root directory to search", "../project-example/")
  .action((dir: string) => {
    const wadFiles = findWadFiles(dir);
    for (const wadPath of wadFiles) {
      try {
        extractWad(path.resolve(wadPath));
      } catch (e) {
        console.error(`  Skipping ${wadPath}: ${e}`);
      }
    }
  });

program.parse();
