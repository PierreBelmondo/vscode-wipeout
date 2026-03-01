import * as fs from "fs";
import * as path from "path";

import { FNT } from "@core/formats/fnt";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);
  return ab;
}

async function dumpFnt(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const fnt = await FNT.load(toArrayBuffer(buffer));

  const platform = fnt.range.le ? "PSP/PS2 (LE)" : "PS3 (BE)";
  console.log(`\n${path.basename(filePath)}  [${platform}]`);
  console.log(`  Glyphs:      ${fnt.header.glyphs}`);
  console.log(`  Font height: ${fnt.header.fontHeight}`);
  if (fnt.imageHeader) {
    console.log(`  Image:       ${fnt.imageHeader.width} x ${fnt.imageHeader.height}  (Gray4)`);
  } else {
    console.log(`  Image:       (separate .pct file)`);
  }
  console.log(`  Image off:   0x${fnt.header.imageOffset.toString(16)}`);

  console.log(`  Charset (${fnt.charset.length}): ${fnt.charset.slice(0, 32).map((cp) => (cp >= 0x20 && cp < 0x7f ? String.fromCodePoint(cp) : `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`)).join(" ")}${fnt.charset.length > 32 ? " ..." : ""}`);

  console.log(`  Glyphs:`);
  for (const g of fnt.glyphs.slice(0, 20)) {
    const ch = g.codepoint >= 0x20 && g.codepoint < 0x7f ? `'${String.fromCodePoint(g.codepoint)}'` : `U+${g.codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
    console.log(`    ${ch.padEnd(8)} tex=[${g.texX1},${g.texY1}]..[${g.texX2},${g.texY2}] (${g.texWidth}x${g.texHeight})  pixW=${g.pixelWidth}  adv=${g.advanceX}`);
  }
  if (fnt.glyphs.length > 20) {
    console.log(`    ... (${fnt.glyphs.length - 20} more)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    for (const arg of args) {
      await dumpFnt(arg);
    }
    return;
  }

  // Default: dump a representative set from project-example
  const samples = [
    "../project-example/psp/pure/us/1.04/Data/FE/Fonts/HUDFont.fnt",
    "../project-example/psp/pulse/us/1.00/Data/FE/Fonts/pulse_20.fnt",
    "../project-example/ps2/pulse/Data/FE/Fonts/pulse_20.fnt",
    "../project-example/ps3/NPEA00000/USRDIR/data/fe/fonts/pulse_20.fnt",
    "../project-example/ps3/hdf/data/fe/fonts/helv.fnt",
  ];

  for (const sample of samples) {
    const resolved = path.resolve(__dirname, "..", sample);
    if (fs.existsSync(resolved)) {
      await dumpFnt(resolved);
    } else {
      console.log(`\n[skip] ${sample} — not found`);
    }
  }
}

main().catch(console.error);
