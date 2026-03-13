/**
 * Debug script for PS5/PSVita rcsmodel files.
 *
 * Usage: npx tsx --tsconfig scripts/tsconfig.json scripts/rcsmodel_ps5.ts <command> [options]
 *
 * Commands:
 *   dump <files...>       Scene graph + geometry dump
 *   materials <files...>  Material table dump
 */

import * as fs from "fs";
import { Command } from "commander";

import {
  RcsModelPS5,
  RcsModelPS5Header,
  RcsModelPS5RelocTable,
  RcsModelPS5DataHeader,
  RcsModelPS5SceneGraphSection,
  RcsModelPS5GeometrySection,
  RcsModelPS5Material,
} from "@core/formats/rcs/rcsmodel_ps5";
import type { BufferRange } from "@core/utils/range";

// ── Helpers ──────────────────────────────────────────────────────────────────

let gShowHex = false;

const VTXELEM_NAMES = new Map<number, string>([
  [0xb9d31b0a, "position"],
  [0xde7a971b, "normal"],
  [0xdbe5f417, "tangent"],
  [0x7493d450, "VertexColour1"],
  [0x427214fc, "Uv1"],
  [0xed9a85ea, "VertexColour2"],
  [0xdb7b4546, "Uv2"],
  [0xac7c75d0, "Uv3"],
  [0x3218e073, "Uv4"],
  [0x7a3f521c, "Uv?"],
]);

function read(filePath: string): ArrayBuffer {
  const buffer = fs.readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function hex8(v: number)  { return v.toString(16).padStart(2, "0"); }
function hex32(v: number) { return (v >>> 0).toString(16).padStart(8, "0"); }

/** Hex row using a BufferRange — offset is range-local, displayed as both relative and absolute file offset. */
function hexRowR(range: BufferRange, off: number, len: number, label: string) {
  const fileBytes = new Uint8Array(range.buffer);
  const hex: string[] = [];
  for (let i = 0; i < len; i++) {
    hex.push(i < fileBytes.length ? hex8(fileBytes[off + i]) : "??");
  }
  console.log(`  ${hex32(range.begin + off)}+${off.toString(16).padStart(4, "0")}  ${hex.join(" ").padEnd(48)}  ${label}`);
}

class Output {
  private indent = 0;

  push(n = 2) { this.indent += n; }
  pop(n = 2)  { this.indent -= n; }

  pad(): string { return " ".repeat(this.indent); }

  h1(text: string) {
    console.log(`\n${this.pad()}${text}`);
    console.log(`${this.pad()}${"=".repeat(text.length)}`);
  }

  h2(text: string) {
    console.log(`${this.pad()}${text}`);
    console.log(`${this.pad()}${"-".repeat(text.length)}`);
  }

  kv(key: string, value: string | number) {
    console.log(`${this.pad()}${key.padEnd(20)} ${value}`);
  }

  log(text: string) {
    for (const line of text.split("\n")) { console.log(`${this.pad()}${line}`); }
  }

  br() { console.log(); }
}

const out = new Output();

// ── Per-class dump functions ────────────────────────────────────────────────

function dumpHeader(header: RcsModelPS5Header) {
  const r = header.range;
  if (gShowHex) {
    hexRowR(r, 0x00, 4, `magic = 0x${hex32(header.magic)}`);
    hexRowR(r, 0x04, 4, `lookup_table_slots = ${header.lookup_table_slots}`);
    hexRowR(r, 0x08, 4, `section_count = ${header.section_count}`);
    hexRowR(r, 0x0c, 4, `data_offset = 0x${hex32(header.data_offset)}`);
    hexRowR(r, 0x10, 4, `reloc_table_offset = 0x${hex32(header.reloc_table_offset)}`);
    hexRowR(r, 0x14, 12, `(padding)`);
  } else {
    out.kv("magic", `0x${hex32(header.magic)}`);
    out.kv("sections", header.section_count);
    out.kv("data_offset", `0x${hex32(header.data_offset)}`);
  }
  out.br();

  // Section defs
  for (let i = 0; i < header.sections.length; i++) {
    const def = header.sections[i];
    if (gShowHex) {
      out.log(`section[${i}]:`);
      out.kv(`  hash`, `0x${hex32(def.hash)}`);
      out.kv(`  size`, `0x${def.size.toString(16)} (${def.size})`);
      out.kv(`  field08`, `${def.field08}`);
      out.kv(`  reloc_count`, `${def.reloc_count}`);
      out.br();
    } else {
      out.kv(`section[${i}].hash`, `0x${hex32(def.hash)}`);
      out.kv(`section[${i}].size`, `0x${def.size.toString(16)} (${def.size})`);
      out.kv(`section[${i}].reloc`, def.reloc_count);
    }
  }
  out.br();
}

function dumpRelocTable(reloc: RcsModelPS5RelocTable) {
  if (!gShowHex) return;

  const r = reloc.range;
  out.h2(`Relocation table @ 0x${hex32(r.begin)}  (${reloc.count} entries × 8 bytes)`);
  const maxShow = 8;
  const showHead = Math.min(reloc.count, maxShow);
  for (let i = 0; i < showHead; i++) {
    const [lo, hi] = reloc.entries[i];
    hexRowR(r, i * 8, 8, `reloc[${i}] = 0x${hex32(hi)}_${hex32(lo)}`);
  }
  if (reloc.count > maxShow + 3) {
    out.log(`  ... (${reloc.count - maxShow - 3} more entries)`);
    for (let i = reloc.count - 3; i < reloc.count; i++) {
      const [lo, hi] = reloc.entries[i];
      hexRowR(r, i * 8, 8, `reloc[${i}] = 0x${hex32(hi)}_${hex32(lo)}`);
    }
  } else {
    for (let i = showHead; i < reloc.count; i++) {
      const [lo, hi] = reloc.entries[i];
      hexRowR(r, i * 8, 8, `reloc[${i}] = 0x${hex32(hi)}_${hex32(lo)}`);
    }
  }
  out.br();
}

function dumpDataHeader(dh: RcsModelPS5DataHeader, isVita: boolean) {
  if (!gShowHex) return;

  const r = dh.range;
  out.h2(`Data header @ 0x${hex32(r.begin)} (${r.size} bytes)`);
  hexRowR(r, 0x00, 4, `version = 0x${hex32(dh.version)}`);
  hexRowR(r, 0x04, 4, `field04 = ${dh.field04}`);
  hexRowR(r, 0x08, 4, `field08 = 0x${hex32(dh.field08)}`);
  hexRowR(r, 0x0c, 4, `field0c = 0x${hex32(dh.field0c)}`);
  hexRowR(r, 0x10, 4, `node_count = ${dh.node_count_lo} / ${dh.node_count_hi}`);
  hexRowR(r, 0x14, 4, `field14 = ${dh.field14}`);
  console.log(`  ${"—".repeat(24)}  ${isVita ? "Vita (32-bit)" : "PS5 (64-bit)"}`);

  if (isVita) {
    hexRowR(r, 0x18, 4, `hash_table1_offset = 0x${hex32(dh.hash_table1_offset)}`);
    hexRowR(r, 0x1c, 4, `hash_table2_offset = 0x${hex32(dh.hash_table2_offset)}`);
    hexRowR(r, 0x20, 4, `transforms_offset = 0x${hex32(dh.transforms_offset)}`);
    hexRowR(r, 0x24, 4, `field24`);
    hexRowR(r, 0x28, 4, `shape_count = ${dh.shape_count} / hash2_count = ${dh.hash2_count}`);
    hexRowR(r, 0x2c, 4, `shape_table_offset = 0x${hex32(dh.shape_table_offset)}`);
    hexRowR(r, 0x30, 4, `field30 = 0x${hex32(dh.field30)}`);
    for (let off = 0x34; off < 0x3c; off += 4) {
      hexRowR(r, off, 4, `field${hex8(off)}`);
    }
    hexRowR(r, 0x3c, 4, `field3c = 0x${hex32(dh.field3c)}`);
    for (let off = 0x40; off < 0x44; off += 4) {
      hexRowR(r, off, 4, `field${hex8(off)}`);
    }
    hexRowR(r, 0x44, 4, `material_count = ${dh.material_count}`);
    hexRowR(r, 0x48, 4, `material_table_offset = 0x${hex32(dh.material_table_offset)}`);
    hexRowR(r, 0x4c, 4, `field4c`);
  } else {
    hexRowR(r, 0x18, 8, `hash_table1_offset = 0x${hex32(dh.hash_table1_offset)}`);
    hexRowR(r, 0x20, 8, `hash_table2_offset = 0x${hex32(dh.hash_table2_offset)}`);
    hexRowR(r, 0x28, 8, `transforms_offset = 0x${hex32(dh.transforms_offset)}`);
    for (let off = 0x30; off < 0x38; off += 4) {
      hexRowR(r, off, 4, `field${hex8(off)}`);
    }
    hexRowR(r, 0x38, 4, `shape_count = ${dh.shape_count} / hash2_count = ${dh.hash2_count}`);
    hexRowR(r, 0x3c, 4, `field3c`);
    hexRowR(r, 0x40, 8, `shape_table_offset = 0x${hex32(dh.shape_table_offset)}`);
    for (let off = 0x48; off < 0x70; off += 4) {
      hexRowR(r, off, 4, `field${hex8(off)}`);
    }
    hexRowR(r, 0x70, 4, `material_count = ${dh.material_count}`);
    hexRowR(r, 0x74, 4, `(pad)`);
    hexRowR(r, 0x78, 8, `material_table_offset = 0x${hex32(dh.material_table_offset)}`);
    for (let off = 0x80; off < 0x98; off += 4) {
      hexRowR(r, off, 4, `field${hex8(off)}`);
    }
  }
  out.br();
}

function dumpDataTables(dh: RcsModelPS5DataHeader, dataRange: BufferRange) {
  const r = dataRange;

  // Node hash table
  out.h2(`Node hashes (${dh.node_hashes.length}) @ +0x${hex32(dh.hash_table1_offset)}`);
  out.push();
  for (let i = 0; i < dh.node_hashes.length; i++) {
    if (gShowHex) {
      hexRowR(r, dh.hash_table1_offset + i * 4, 4, `node_hash[${i}] = 0x${hex32(dh.node_hashes[i])}`);
    } else {
      out.log(`[${i}] 0x${hex32(dh.node_hashes[i])}`);
    }
  }
  out.pop();
  out.br();

  // Shape hash table
  out.h2(`Shape hashes (${dh.shape_hashes.length}) @ +0x${hex32(dh.hash_table2_offset)}`);
  out.push();
  for (let i = 0; i < dh.shape_hashes.length; i++) {
    if (gShowHex) {
      hexRowR(r, dh.hash_table2_offset + i * 4, 4, `shape_hash[${i}] = 0x${hex32(dh.shape_hashes[i])}`);
    } else {
      out.log(`[${i}] 0x${hex32(dh.shape_hashes[i])}`);
    }
  }
  out.pop();
  out.br();

  // Transform matrices
  out.h2(`Transforms (${dh.transforms.length}) @ +0x${hex32(dh.transforms_offset)}`);
  out.push();
  for (let i = 0; i < dh.transforms.length; i++) {
    const m = dh.transforms[i].elements;
    const isIdentity = m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
      m[1] === 0 && m[2] === 0 && m[3] === 0 && m[4] === 0 &&
      m[6] === 0 && m[7] === 0 && m[8] === 0 && m[9] === 0 &&
      m[11] === 0 && m[12] === 0 && m[13] === 0 && m[14] === 0;

    if (gShowHex) {
      const off = dh.transforms_offset + i * 64;
      if (isIdentity) {
        hexRowR(r, off, 16, `transform[${i}] = IDENTITY`);
      } else {
        for (let row = 0; row < 4; row++) {
          const ri = row * 4;
          hexRowR(r, off + row * 16, 16,
            `transform[${i}][${row}] = ${m[ri].toFixed(4)}, ${m[ri+1].toFixed(4)}, ${m[ri+2].toFixed(4)}, ${m[ri+3].toFixed(4)}`);
        }
      }
    } else {
      if (isIdentity) {
        out.log(`[${i}] IDENTITY`);
      } else {
        out.log(`[${i}]`);
        out.push();
        for (let row = 0; row < 4; row++) {
          const ri = row * 4;
          out.log(`${m[ri].toFixed(4)}, ${m[ri+1].toFixed(4)}, ${m[ri+2].toFixed(4)}, ${m[ri+3].toFixed(4)}`);
        }
        out.pop();
      }
    }
  }
  out.pop();
  out.br();

  // Shape pointer table
  out.h2(`Shape pointers (${dh.shape_ptrs.length}) @ +0x${hex32(dh.shape_table_offset)}`);
  out.push();
  for (let i = 0; i < dh.shape_ptrs.length; i++) {
    out.log(`[${i}] → 0x${hex32(dh.shape_ptrs[i])}`);
  }
  out.pop();
  out.br();
}

function dumpSceneGraph(sg: RcsModelPS5SceneGraphSection) {
  const r = sg.range;

  // Geo metas (sentinel-scanned nodes referencing geometry in section 2)
  out.h2(`Geo metas (${sg.geoMetas.length})`);
  out.push();
  for (let i = 0; i < sg.geoMetas.length; i++) {
    const gm = sg.geoMetas[i];
    out.log(`[${i}] ${gm.name.padEnd(30)} idx=${gm.index_count}  vrt=${gm.vert_count}  sub=${gm.submesh_count}  mat=${gm.material_index}  ibo=0x${hex32(gm.ibo_sec2_off)}  sentinel=0x${hex32(gm.sentinel)}`);

    if (gm.vtxdef) {
      const vd = gm.vtxdef;
      out.push();
      out.log(`vtxdef: stride=${vd.stride} mat=${vd.mat}`);
      for (const el of vd.elements) {
        const name = VTXELEM_NAMES.get(el.hash) ?? `0x${hex32(el.hash)}`;
        out.log(`  ${name.padEnd(16)} offset=${el.offset}  fmt=0x${hex8(el.format)}  stride=${el.vtxStride}  flags=0x${hex8(el.flags)}`);
      }
      out.pop();
    }

    if (gShowHex) {
      const s = gm.sentinel;
      // Detect variant from field offsets stored in the geo meta
      const isVita = r.size > 0 && sg.materials.length > 0; // heuristic: Vita has materials in this section
      const F_IDX = isVita ? 0x10 : 0x18;
      const F_VRT = isVita ? 0x14 : 0x1c;
      const F_SUB = isVita ? 0x18 : 0x20;
      const F_IBO = isVita ? 0x20 : 0x28;
      const F_VBO = isVita ? 0x3c : 0x48;
      const blockEnd = isVita ? 0x4c : 0x50;

      out.push();
      hexRowR(r, s + 0x00, 4, `sentinel = 0xffffffff`);
      hexRowR(r, s + 0x04, 4, `(zero)`);
      if (isVita) {
        hexRowR(r, s + 0x08, 2, `parent_node = ${r.getUint16(s + 0x08)}`);
        hexRowR(r, s + 0x0a, 2, `node_index = ${r.getUint16(s + 0x0a)}`);
        hexRowR(r, s + 0x0c, 4, `field_0c = 0x${hex32(r.getUint32(s + 0x0c))}`);
      } else {
        hexRowR(r, s + 0x08, 16, `fields 0x08..0x17`);
      }
      hexRowR(r, s + F_IDX, 4, `index_count = ${gm.index_count}`);
      hexRowR(r, s + F_VRT, 4, `vert_count = ${gm.vert_count}`);
      hexRowR(r, s + F_SUB, 4, `submesh_count = ${gm.submesh_count}`);
      // Dump bytes between submesh and ibo
      for (let off = F_SUB + 4; off < F_IBO; off += 4) {
        hexRowR(r, s + off, 4, `field_${hex8(off)} = 0x${hex32(r.getUint32(s + off))}`);
      }
      hexRowR(r, s + F_IBO, 4, `ibo_sec2_off = 0x${hex32(gm.ibo_sec2_off)}`);
      // Dump bytes between ibo and vbo
      for (let off = F_IBO + 4; off < F_VBO; off += 4) {
        hexRowR(r, s + off, 4, `field_${hex8(off)} = 0x${hex32(r.getUint32(s + off))}`);
      }
      hexRowR(r, s + F_VBO, 4, `vbo_sec2_off = 0x${hex32(gm.vbo_sec2_off)}`);
      // Remaining fields after vbo
      for (let off = F_VBO + 4; off < blockEnd; off += 4) {
        hexRowR(r, s + off, 4, `field_${hex8(off)} = 0x${hex32(r.getUint32(s + off))}`);
      }
      out.pop();
      out.br();
    }
  }
  out.pop();
  out.br();

  if (sg.materials.length === 0) return;

  out.h2(`Materials (${sg.materials.length})`);
  out.push();

  if (gShowHex) {
    const matTableOff = r.getUint32(0x48);
    out.br();

    for (let i = 0; i < sg.materials.length; i++) {
      const mat = sg.materials[i];
      const matPtr = matTableOff + i * 4 < r.size ? r.getUint32(matTableOff + i * 4) : 0;
      if (matPtr === 0 || matPtr + 0x3c > r.size) continue;

      out.log(`[${i}] ${mat.rcsmaterialPath.split("/").pop()?.replace(".rcsmaterial", "")}`);
      hexRowR(r, matPtr + 0x00, 4, `hash = 0x${hex32(mat.hash)}`);
      hexRowR(r, matPtr + 0x04, 4, `rcsmaterial_path_ptr → ${mat.rcsmaterialPath}`);
      hexRowR(r, matPtr + 0x08, 4, `field_08 = 0x${hex32(r.getUint32(matPtr + 0x08))}`);
      hexRowR(r, matPtr + 0x0c, 4, `field_0c = 0x${hex32(r.getUint32(matPtr + 0x0c))}`);
      hexRowR(r, matPtr + 0x10, 4, `field_10 = 0x${hex32(r.getUint32(matPtr + 0x10))}`);
      hexRowR(r, matPtr + 0x14, 4, `field_14 = 0x${hex32(r.getUint32(matPtr + 0x14))}`);
      hexRowR(r, matPtr + 0x18, 4, `name_ptr → ${mat.name}`);
      hexRowR(r, matPtr + 0x1c, 4, `field_1c = 0x${hex32(r.getUint32(matPtr + 0x1c))}`);
      hexRowR(r, matPtr + 0x20, 4, `field_20 = ${r.getUint32(matPtr + 0x20)}`);
      hexRowR(r, matPtr + 0x24, 4, `field_24 = 0x${hex32(r.getUint32(matPtr + 0x24))}`);
      hexRowR(r, matPtr + 0x28, 4, `field_28 = ${r.getUint32(matPtr + 0x28)}`);
      hexRowR(r, matPtr + 0x2c, 4, `field_2c = 0x${hex32(r.getUint32(matPtr + 0x2c))}`);
      const texCount = r.getUint32(matPtr + 0x30);
      const texListPtr = r.getUint32(matPtr + 0x34);
      hexRowR(r, matPtr + 0x30, 4, `texture_count = ${texCount}`);
      hexRowR(r, matPtr + 0x34, 4, `texture_list_ptr = 0x${hex32(texListPtr)}`);
      hexRowR(r, matPtr + 0x38, 4, `field_38 = 0x${hex32(r.getUint32(matPtr + 0x38))}`);
      hexRowR(r, matPtr + 0x3c, 4, `field_3c = 0x${hex32(r.getUint32(matPtr + 0x3c))}`);

      // Texture entries
      for (let t = 0; t < texCount; t++) {
        const texOff = texListPtr + t * 0x18;
        if (texOff + 0x18 > r.size) break;
        const pathPtr = r.getUint32(texOff + 0x10);
        out.log(`  tex[${t}]:`);
        hexRowR(r, texOff + 0x00, 4, `hash = 0x${hex32(r.getUint32(texOff + 0x00))}`);
        hexRowR(r, texOff + 0x04, 4, `field_04 = ${r.getUint32(texOff + 0x04)}`);
        hexRowR(r, texOff + 0x08, 4, `field_08 = 0x${hex32(r.getUint32(texOff + 0x08))}`);
        hexRowR(r, texOff + 0x0c, 4, `field_0c = 0x${hex32(r.getUint32(texOff + 0x0c))}`);
        let resolvedPath = "(null)";
        if (pathPtr > 0 && pathPtr < r.size) {
          resolvedPath = r.getCString(pathPtr);
        }
        hexRowR(r, texOff + 0x10, 4, `gxt_path_ptr → ${resolvedPath}`);
        hexRowR(r, texOff + 0x14, 4, `field_14 = 0x${hex32(r.getUint32(texOff + 0x14))}`);
      }
      out.br();
    }
  } else {
    for (let i = 0; i < sg.materials.length; i++) {
      const mat = sg.materials[i];
      out.kv(`[${i}] hash`, `0x${hex32(mat.hash)}`);
      out.kv(`    rcsmaterial`, mat.rcsmaterialPath);
      out.kv(`    name`, mat.name);
      for (const tp of mat.texturePaths) {
        out.kv(`    texture`, tp);
      }
      out.br();
    }
  }
  out.pop();
}

function dumpGeometry(
  geo: RcsModelPS5GeometrySection,
  materials: RcsModelPS5Material[],
  filter?: string,
) {
  out.h2(`Shapes (${geo.shapes.length})`);
  out.push();

  const r = geo.range;

  for (let i = 0; i < geo.shapes.length; i++) {
    const shape = geo.shapes[i];
    if (filter && !shape.name.includes(filter)) continue;

    const mesh = geo.meshes[i];
    const matLabel = shape.material_index >= 0 && shape.material_index < materials.length
      ? materials[shape.material_index].rcsmaterialPath.split("/").pop()?.replace(".rcsmaterial", "") ?? `#${shape.material_index}`
      : `#${shape.material_index}`;

    out.log(`[${i}] ${shape.name}  mat=${matLabel}  idx=${shape.index_count}  vrt=${shape.vert_count}  sub=${shape.submesh_count}`);

    const showVerts = Math.min(shape.vert_count, 3);
    out.push();

    if (gShowHex) {
      // IBO hex dump (first 12 indices)
      const iboOff = shape.ibo_sec2_off;
      const iboShow = Math.min(shape.index_count, 12);
      if (iboShow > 0) {
        const indices: string[] = [];
        for (let j = 0; j < iboShow; j++) {
          indices.push(r.getUint16(iboOff + j * 2).toString());
        }
        hexRowR(r, iboOff, iboShow * 2, `ibo[0..${iboShow - 1}] = ${indices.join(", ")}`);
        if (shape.index_count > iboShow) out.log(`... (${shape.index_count - iboShow} more indices)`);
      }

      // VBO hex dump (first 3 vertices)
      let vboOff = iboOff + shape.index_count * 2;
      vboOff = (vboOff + 3) & ~3;

      // Compute stride from adjacency
      let stride = 0;
      if (i + 1 < geo.shapes.length) {
        const nextIbo = geo.shapes[i + 1].ibo_sec2_off;
        if (nextIbo > vboOff && shape.vert_count > 0) {
          stride = (nextIbo - vboOff) / shape.vert_count;
        }
      }
      if (stride === 0 && shape.vert_count > 0) {
        stride = (r.size - vboOff) / shape.vert_count;
      }
      const s = Math.round(stride);

      if (s > 0) {
        for (let vi = 0; vi < showVerts; vi++) {
          const base = vboOff + vi * s;
          hexRowR(r, base, Math.min(s, 16), `v${vi} [0x${hex8(0)}..0x${hex8(Math.min(s, 16) - 1)}]`);
          if (s > 16) hexRowR(r, base + 16, Math.min(s - 16, 16), `v${vi} [0x${hex8(16)}..0x${hex8(Math.min(s, 32) - 1)}]`);
          if (s > 32) hexRowR(r, base + 32, s - 32, `v${vi} [0x${hex8(32)}..0x${hex8(s - 1)}]`);
        }
      }
    }

    for (let vi = 0; vi < showVerts; vi++) {
      const px = mesh.vbo.positions[vi * 3 + 0].toFixed(3);
      const py = mesh.vbo.positions[vi * 3 + 1].toFixed(3);
      const pz = mesh.vbo.positions[vi * 3 + 2].toFixed(3);
      const nx = mesh.vbo.normals[vi * 3 + 0].toFixed(2);
      const ny = mesh.vbo.normals[vi * 3 + 1].toFixed(2);
      const nz = mesh.vbo.normals[vi * 3 + 2].toFixed(2);
      const u = mesh.vbo.uvs[vi * 2 + 0].toFixed(4);
      const v = mesh.vbo.uvs[vi * 2 + 1].toFixed(4);
      out.log(`v${vi}: pos=(${px}, ${py}, ${pz})  nrm=(${nx}, ${ny}, ${nz})  uv=(${u}, ${v})`);
    }
    if (shape.vert_count > showVerts) {
      out.log(`... (${shape.vert_count - showVerts} more vertices)`);
    }
    out.pop();
    out.br();
  }
  out.pop();
}

// ── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name("rcsmodel_ps5")
  .description("PS5/PSVita rcsmodel research tool");

program
  .command("dump <files...>")
  .description("Dump scene graph shapes and geometry info")
  .option("--filter <name>", "Filter shapes by name substring")
  .option("--hex", "Show raw hex bytes alongside decoded data")
  .action((files: string[], opts: { filter?: string; hex?: boolean }) => {
    gShowHex = !!opts.hex;

    for (const file of files) {
      const ab = read(file);
      const model = RcsModelPS5.load(ab);
      const variant = model.header.isVita ? "PSVita" : "PS5";

      out.h1(`${file}  (${variant}, ${ab.byteLength} bytes)`);

      dumpHeader(model.header);
      dumpRelocTable(model.header.relocTable);
      dumpDataHeader(model.data.header, model.header.isVita);
      dumpDataTables(model.data.header, model.data.range);

      for (let si = 0; si < model.data.sections.length; si++) {
        const sec = model.data.sections[si];
        const def = model.header.sections[si];
        const typeName = sec instanceof RcsModelPS5SceneGraphSection ? "SceneGraph"
          : sec instanceof RcsModelPS5GeometrySection ? "Geometry"
          : "Unknown";
        out.h1(`Data section #${si} - ${typeName} (hash:0x${hex32(def.hash)})  size=0x${def.size.toString(16)}  @ 0x${hex32(sec.range.begin)}`);

        if (sec instanceof RcsModelPS5SceneGraphSection) {
          dumpSceneGraph(sec);
        } else if (sec instanceof RcsModelPS5GeometrySection) {
          dumpGeometry(sec, model.materials, opts.filter);
        }
      }

      if (model.parseErrors.length > 0) {
        out.h2("Parse errors");
        for (const err of model.parseErrors) {
          out.log(`  ! ${err}`);
        }
      }
    }
  });

program
  .command("materials <files...>")
  .description("Dump material table only")
  .action((files: string[]) => {
    for (const file of files) {
      const ab = read(file);
      const model = RcsModelPS5.load(ab);

      out.h1(`${file}  (${model.materials.length} materials)`);
      out.push();
      for (let i = 0; i < model.materials.length; i++) {
        const mat = model.materials[i];
        const basename = mat.rcsmaterialPath.split("/").pop()?.replace(".rcsmaterial", "") ?? "";
        out.log(`[${i}] ${basename}`);
        out.push();
        out.kv("hash", `0x${hex32(mat.hash)}`);
        out.kv("rcsmaterial", mat.rcsmaterialPath);
        out.kv("name", mat.name);
        for (let t = 0; t < mat.texturePaths.length; t++) {
          out.kv(`texture[${t}]`, mat.texturePaths[t]);
        }
        out.pop();
        out.br();
      }
      out.pop();

      out.h2("Shape → Material mapping");
      out.push();
      for (let i = 0; i < model.shapes.length; i++) {
        const shape = model.shapes[i];
        const mi = shape.material_index;
        const matName = mi >= 0 && mi < model.materials.length
          ? model.materials[mi].rcsmaterialPath.split("/").pop()?.replace(".rcsmaterial", "") ?? `#${mi}`
          : `#${mi}`;
        out.log(`[${i}] ${shape.name.padEnd(30)} → ${matName}`);
      }
      out.pop();
    }
  });

program.parse(process.argv);
