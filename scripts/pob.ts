import * as fs from "fs";
import * as path from "path";

import { POB, POB_NULL_OFFSET } from "@core/formats/pob";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);
  return ab;
}

function hex(n: number, w = 0): string {
  return "0x" + n.toString(16).padStart(w, "0");
}

function findPob(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.pob$/i.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

async function dump(filePath: string) {
  const pob = await POB.load(toArrayBuffer(fs.readFileSync(filePath)));
  const fileSize = pob.range.size;

  console.log(`\n${path.basename(filePath)}  [${pob.bigEndian ? "PS3 (BE)" : "PSP/PS2/Vita (LE)"}]`);
  console.log(`  Name:        ${pob.name}`);
  console.log(`  File size:   ${fileSize}`);
  console.log(`  Header size: ${pob.header.size}  (0x10 + 4*${pob.header.offsetCount} + 16)`);
  console.log(`  Data size:   ${pob.header.dataSize}  ${fileSize - pob.header.dataSize === pob.header.size ? "(consistent)" : "(MISMATCH)"}`);
  console.log(`  Version:     ${pob.header.version}   unknown@0x0C: ${pob.header.unknown0C}`);

  const nulls = pob.header.offsets.filter((o) => o === POB_NULL_OFFSET).length;
  console.log(`  Offsets:     ${pob.header.offsetCount} slots, ${pob.blocks.length} used, ${nulls} null`);

  console.log(`  Blocks:`);
  for (const b of pob.blocks) {
    const head = [...new Uint8Array(b.range.getArrayBuffer(0, Math.min(16, b.size)))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join(" ");
    console.log(`    [${String(b.index).padStart(2)}] @${hex(b.offset, 6)}  ${String(b.size).padStart(6)} bytes  ${head}`);
  }

  if (pob.textures.length) {
    console.log(`  Textures:`);
    for (const t of pob.textures) {
      console.log(`    desc@${hex(t.offset, 6)}  ${t.width}x${t.height}  ${t.bitsPerPixel}bpp/${t.colors}c  clut@${hex(t.clutOffset, 6)}  data@${hex(t.dataOffset, 6)}`);
    }
  }

  const paths = pob.texturePaths;
  if (paths.length) {
    console.log(`  Source assets:`);
    for (const p of paths) console.log(`    ${p}`);
  }
}

async function scan(dir: string) {
  const files = findPob(dir);
  let ok = 0;
  const failures: string[] = [];
  const blockSizes = new Map<number, number>();
  let textureCount = 0;
  let filesWithTextures = 0;

  for (const f of files) {
    try {
      const pob = await POB.load(toArrayBuffer(fs.readFileSync(f)));
      const fileSize = pob.range.size;

      // Invariants verified across the full sample corpus.
      if (fileSize - pob.header.dataSize !== pob.header.size) throw new Error("header size mismatch");
      if (pob.header.offsetCount % 4 !== 0) throw new Error("offset count not a multiple of 4");
      if (!pob.name.length) throw new Error("empty name");
      for (const o of pob.usedOffsets) {
        if (o >= fileSize) throw new Error(`offset ${hex(o)} past EOF`);
      }
      for (let i = 1; i < pob.usedOffsets.length; i++) {
        if (pob.usedOffsets[i] < pob.usedOffsets[i - 1]) throw new Error("offsets not monotonic");
      }
      for (const b of pob.blocks) blockSizes.set(b.size, (blockSizes.get(b.size) ?? 0) + 1);
      for (const t of pob.textures) t.toMipmap(); // exercise the decoder
      textureCount += pob.textures.length;
      if (pob.textures.length) filesWithTextures++;
      ok++;
    } catch (e) {
      failures.push(`${f}: ${(e as Error).message}`);
    }
  }

  console.log(`Parsed ${ok}/${files.length} files`);
  for (const f of failures) console.log(`  FAIL ${f}`);

  console.log(`\nTextures: ${textureCount} in ${filesWithTextures} files`);

  console.log(`\nMost common block sizes:`);
  const top = [...blockSizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [size, count] of top) {
    console.log(`  ${hex(size).padEnd(8)} ${String(size).padStart(7)} bytes  x${count}`);
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "scan") {
    await scan(args[0] ?? "../project-example");
  } else if (cmd === "dump") {
    for (const f of args) await dump(f);
  } else {
    console.log("usage: pob.ts dump <files...> | pob.ts scan [dir]");
    process.exit(1);
  }
}

main();
