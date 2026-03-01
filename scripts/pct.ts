import * as fs from "fs";
import * as path from "path";

import { PCT } from "@core/formats/pct";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);
  return ab;
}

function dumpPct(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const pct = PCT.load(toArrayBuffer(buffer));

  console.log(`\n${path.basename(filePath)}`);
  console.log(`  Size:   ${pct.width} x ${pct.height}`);
  if (pct.mipmap) {
    console.log(`  Format: ${pct.mipmap.type}`);
    console.log(`  Pixels: ${pct.mipmap.data.length / 4}`);
    // Print first few pixel colors
    const data = pct.mipmap.data as Uint8Array;
    const sample = Math.min(4, pct.width * pct.height);
    for (let i = 0; i < sample; i++) {
      const r = data[i * 4 + 0];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const a = data[i * 4 + 3];
      console.log(`  pixel[${i}]: R=${r} G=${g} B=${b} A=${a}`);
    }
  } else {
    console.log(`  (could not decode)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    for (const arg of args) {
      dumpPct(arg);
    }
    return;
  }

  const samples = [
    "../project-example/ps2/fusion_unpacked/Data/Targetdata/PS2/Data/Billboards/Pulse_Adverts/_textures/feisar001.pct",
    "../project-example/ps2/fusion_unpacked/Data/Targetdata/PS2/Data/Billboards/Pulse_Adverts/_textures/bgscroll001.pct",
    "../project-example/ps2/fusion_unpacked/Data/Targetdata/PS2/Data/Billboards/Pulse_Adverts/_textures/white_nonalpha.pct",
    "../project-example/ps2/fusion_unpacked/Data/Targetdata/PS2/Data/FE/Fonts/pulse_20.pct",
  ];

  for (const sample of samples) {
    const resolved = path.resolve(__dirname, "..", sample);
    if (fs.existsSync(resolved)) {
      dumpPct(resolved);
    } else {
      console.log(`\n[skip] ${sample} — not found`);
    }
  }
}

main().catch(console.error);
