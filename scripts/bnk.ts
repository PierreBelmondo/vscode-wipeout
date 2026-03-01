import * as fs from "fs";
import * as path from "path";

import {
  Bnk,
  GRAIN_TYPE_WAVE,
  GRAIN_TYPE_SILENCE,
  GRAIN_TYPE_JUMP,
  GRAIN_TYPE_RANDOMIZE,
  GRAIN_TYPE_GROUP,
} from "@core/formats/bnk";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);
  return ab;
}

function hex(n: number, width = 8): string {
  return "0x" + n.toString(16).padStart(width, "0");
}

function grainTypeName(type: number): string {
  switch (type) {
    case GRAIN_TYPE_WAVE:      return "wave";
    case GRAIN_TYPE_SILENCE:   return "silence";
    case GRAIN_TYPE_JUMP:      return "jump";
    case GRAIN_TYPE_RANDOMIZE: return "randomize";
    case GRAIN_TYPE_GROUP:     return "group";
    default: return `unknown(${hex(type, 2)})`;
  }
}

function dumpBnk(filePath: string): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`File: ${filePath}`);
  console.log("=".repeat(72));

  const buf = fs.readFileSync(filePath);
  const bnk = Bnk.load(toArrayBuffer(buf));

  const { header, sblk } = bnk;

  console.log(`\n[Header]`);
  console.log(`  version:     ${header.version}`);
  console.log(`  parts:       ${header.parts}`);
  console.log(`  sblk_offset: ${hex(header.sblk_offset)}`);
  console.log(`  sblk_size:   ${hex(header.sblk_size)}`);
  console.log(`  data_offset: ${hex(header.data_offset)}`);
  console.log(`  data_size:   ${hex(header.data_size)}`);

  console.log(`\n[SBlk]`);
  console.log(`  magic:         "${sblk.magic}"`);
  console.log(`  version:       ${hex(sblk.version, 2)}`);
  console.log(`  n_sounds:      ${sblk.n_sounds}`);
  console.log(`  n_grains:      ${sblk.n_grains}`);
  console.log(`  n_streams:     ${sblk.n_streams}  (simultaneous stream slots)`);
  console.log(`  table1_offset: ${hex(sblk.table1_offset)}`);
  console.log(`  table2_offset: ${hex(sblk.table2_offset)}`);
  console.log(`  table3_offset: ${hex(sblk.table3_offset)}`);
  console.log(`  table4_offset: ${hex(sblk.table4_offset)}`);
  if (sblk.spu_base_addr !== 0) {
    console.log(`  spu_base_addr: ${hex(sblk.spu_base_addr)}`);
    console.log(`  ram_size:      ${hex(sblk.ram_size)}`);
  }

  console.log(`\n[Waves]  (${bnk.waves.length} total)`);
  for (let i = 0; i < bnk.waves.length; i++) {
    const w = bnk.waves[i];
    const abs = header.data_offset + w.dataOffset;
    const samples = w.sampleCount;
    console.log(
      `  [${String(i).padStart(2)}]` +
      `  pitch_id=${hex(w.pitch_id)}` +
      `  loop=${w.isLoop ? "y" : "n"}` +
      `  vol=${String(w.volume).padStart(3)}` +
      `  pan=${String(w.pan).padStart(3)}` +
      `  spu_addr=${hex(w.spu_addr)}` +
      `  data=${hex(abs)} size=${hex(w.data_size)} (~${Math.round(samples / 22050 * 10) / 10}s @22050)`
    );
  }

  console.log(`\n[Sounds / Grains]  (${bnk.sounds.length} sounds)`);
  for (let si = 0; si < bnk.sounds.length; si++) {
    const sound = bnk.sounds[si];
    const grains = bnk.grainsForSound(sound);

    console.log(
      `  Sound[${si}]  id=${hex(sound.id)}  flags=${hex(sound.flags)}` +
      `  grain_t2_offset=${hex(sound.grain_table_offset)}`
    );
    for (const grain of grains) {
      const typeName = grainTypeName(grain.grain_type);
      if (grain.isWave) {
        const wave = bnk.waveForGrain(grain);
        const waveIdx = bnk.waveIndexForGrain(grain);
        if (wave) {
          console.log(
            `    grain[wave]  wave_idx=${waveIdx}` +
            `  spu_addr=${hex(wave.spu_addr)}` +
            `  size=${hex(wave.data_size)}` +
            `  loop=${wave.isLoop ? "y" : "n"}` +
            `  extra=${hex(grain.extra)}`
          );
        } else {
          console.log(`    grain[wave]  wave_idx=${waveIdx}  (OUT OF RANGE)  extra=${hex(grain.extra)}`);
        }
      } else {
        console.log(`    grain[${typeName}]  extra=${hex(grain.extra)}`);
      }
    }
  }
}

// Entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  // Default: dump all .bnk files in WipEout Fusion sound dir
  const dir = path.join(__dirname, "../../project-example/ps2/fusion_unpacked/Data/Targetdata/PS2/Data/Sound");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".bnk"));
    for (const f of files) dumpBnk(path.join(dir, f));
  } else {
    console.error(`Default dir not found: ${dir}`);
    console.error("Usage: npx tsx --tsconfig scripts/tsconfig.json scripts/bnk.ts [file.bnk]");
  }
} else {
  for (const arg of args) dumpBnk(path.resolve(arg));
}
