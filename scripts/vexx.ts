import * as fs from "fs";
import * as path from "path";
import { sync as globSync } from "glob";
import { Command } from "commander";

import { BufferRange } from "@core/utils/range";
import { Vexx } from "@core/formats/vexx";
import { VexxNode, VexxNodeMatrix } from "@core/formats/vexx/node";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";
import { Vexx3NodeMesh } from "@core/formats/vexx/v3/mesh";
import { VexxNodeTexture } from "@core/formats/vexx/v4/texture";
import { VexxNodeCamera } from "@core/formats/vexx/v4/camera";
import { VexxNodeSection } from "@core/formats/vexx/v4/section";
import { VexxNodeSound } from "@core/formats/vexx/v4/sound";
import { VexxNodeLensFlare } from "@core/formats/vexx/v4/lens_flare";
import { VexxNodeAmbientLight } from "@core/formats/vexx/v4/ambient_light";
import { VexxNodeAnimTransform } from "@core/formats/vexx/v4/anim_transform";
import { VexxNodeCollision } from "@core/formats/vexx/v4/collision";
import { VexxNodeWorld } from "@core/formats/vexx/v4/world";
import { VexxNodeWoPoint } from "@core/formats/vexx/v4/wo_point";
import { VexxNodeWoSpot } from "@core/formats/vexx/v4/wo_spot";
import { VexxNodeWoTrack } from "@core/formats/vexx/v4/wo_track";
import { VexxNodeDirectionalLight } from "@core/formats/vexx/v4/directional_light";
import { VexxNodeQuake } from "@core/formats/vexx/v4/quake";
import { VexxNodeFogCube } from "@core/formats/vexx/v4/fog_cube";
import { VexxNodeLodGroup } from "@core/formats/vexx/v4/lod_group";
import { VexxNodeShadow } from "@core/formats/vexx/v4/shadow";
import { VexxNodeDynamicShadowOccluder } from "@core/formats/vexx/v4/dynamic_shadow_occluder";
import { GU } from "@core/utils/pspgu";

// ─── I/O helpers ──────────────────────────────────────────────────────────────

function buf2hex(buffer: ArrayBuffer, maxBytes = 64): string {
  const bytes = new Uint8Array(buffer).slice(0, maxBytes);
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join(" ");
}

function rangeHex(range: BufferRange, offset: number, length: number): string {
  const parts: string[] = [];
  for (let i = 0; i < length; i++) {
    parts.push(range.getUint8(offset + i).toString(16).padStart(2, "0"));
  }
  return parts.join(" ");
}

function read(filePath: string): ArrayBuffer {
  const buffer = fs.readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

// ─── Output ───────────────────────────────────────────────────────────────────

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
    console.log(`${this.pad()}${key.padEnd(16)} ${value}`);
  }

  log(text: string) {
    for (const line of text.split("\n")) { console.log(`${this.pad()}${line}`); }
  }

  br() { console.log(); }
}

// ─── Primitive-type name ──────────────────────────────────────────────────────

function primTypeName(type: number): string {
  return ["POINTS","LINES","LINE_STRIP","TRIANGLES","TRIANGLE_STRIP","TRIANGLE_FAN","SPRITES"][type] ?? `?${type}`;
}

let gShowHex = false;

// ─── Node detail dumpers ──────────────────────────────────────────────────────

function dumpNodeDetail(out: Output, node: VexxNode) {
  if (node instanceof VexxNodeWorld) {
    out.kv("source", node.source);
  } else if (node instanceof Vexx3NodeMesh) {
    dumpMeshV3(out, node);
  } else if (node instanceof VexxNodeMesh) {
    dumpMesh(out, node);
  } else if (node instanceof VexxNodeTexture) {
    dumpTexture(out, node);
  } else if (node instanceof VexxNodeCamera) {
    dumpCamera(out, node);
  } else if (node instanceof VexxNodeSection) {
    dumpSection(out, node);
  } else if (node instanceof VexxNodeSound) {
    dumpSound(out, node);
  } else if (node instanceof VexxNodeLensFlare) {
    dumpLensFlare(out, node);
  } else if (node instanceof VexxNodeAmbientLight) {
    out.kv("rgba", `[${Array.from(node.rgba).map((v) => v.toFixed(3)).join(", ")}]`);
  } else if (node instanceof VexxNodeAnimTransform) {
    dumpAnimTransform(out, node);
  } else if (node instanceof VexxNodeCollision) {
    dumpCollision(out, node);
  } else if (node instanceof VexxNodeWoTrack) {
    dumpWoTrack(out, node);
  } else if (node instanceof VexxNodeWoPoint) {
    dumpWoPoint(out, node);
  } else if (node instanceof VexxNodeWoSpot) {
    dumpWoSpot(out, node);
  } else if (node instanceof VexxNodeDirectionalLight) {
    out.kv("rgba", `[${Array.from(node.rgba).map((v) => v.toFixed(3)).join(", ")}]`);
  } else if (node instanceof VexxNodeQuake) {
    dumpQuake(out, node);
  } else if (node instanceof VexxNodeFogCube) {
    dumpFogCube(out, node);
  } else if (node instanceof VexxNodeShadow) {
    out.kv("radius", node.radius.toFixed(4));
  } else if (node instanceof VexxNodeDynamicShadowOccluder) {
    dumpConvexHull(out, node);
  } else if (node instanceof VexxNodeLodGroup) {
    dumpLodGroup(out, node);
  } else if (node instanceof VexxNodeMatrix) {
    const m = node.matrix;
    out.log(
      `matrix:\n` +
      `  [${m[0].toFixed(3)}, ${m[1].toFixed(3)}, ${m[2].toFixed(3)}, ${m[3].toFixed(3)}]\n` +
      `  [${m[4].toFixed(3)}, ${m[5].toFixed(3)}, ${m[6].toFixed(3)}, ${m[7].toFixed(3)}]\n` +
      `  [${m[8].toFixed(3)}, ${m[9].toFixed(3)}, ${m[10].toFixed(3)}, ${m[11].toFixed(3)}]\n` +
      `  [${m[12].toFixed(3)}, ${m[13].toFixed(3)}, ${m[14].toFixed(3)}, ${m[15].toFixed(3)}]`
    );
  } else if (node.header.dataLength > 0) {
    // Unimplemented node — raw hex for research
    const raw = node.bodyRange.getUint8Array(0, Math.min(node.header.dataLength, 64));
    out.log(`raw[0..${Math.min(node.header.dataLength, 64)}]: ${buf2hex(raw.buffer as ArrayBuffer)}`);
    if (node.header.dataLength > 64) { out.log(`  ... (${node.header.dataLength - 64} more bytes)`); }
  }
  if (node.parseErrors.length > 0) {
    for (const e of node.parseErrors) out.log(`  PARSE ERROR: ${e}`);
  }
}

// Fixed-width hex column: addr(6) + ": " + hex(padded to hexWidth) + "  " + kv
const HEX_COL_WIDTH = 59;  // fits 20 bytes (20*3-1=59)
const KEY_COL_WIDTH = 16;

function hexPrefix(range: BufferRange, offset: number, size: number): string {
  const addr = (range.begin + offset).toString(16).padStart(6, "0");
  const hex = rangeHex(range, offset, size);
  return `${addr}: ${hex.padEnd(HEX_COL_WIDTH)}`;
}

function hexBlank(): string {
  return " ".repeat(6 + 2 + HEX_COL_WIDTH);
}

function hexLine(prefix: string, key: string, value: string | number) {
  console.log(`${prefix} ${key.padEnd(KEY_COL_WIDTH)} ${value}`);
}

function hexKv(out: Output, range: BufferRange, offset: number, size: number, key: string, value: string | number) {
  if (gShowHex) {
    hexLine(hexPrefix(range, offset, size), key, value);
  } else {
    out.kv(key, value);
  }
}

function hexComputedKv(out: Output, key: string, value: string | number) {
  if (gShowHex) {
    hexLine(hexBlank(), key, value);
  } else {
    out.kv(key, value);
  }
}

function dumpMeshV3(out: Output, node: Vexx3NodeMesh) {
  const h = node.info;
  const hr = h.range;
  hexKv(out, hr, 0, 2, "meshType", `0x${h.type.toString(16)}`);
  hexKv(out, hr, 2, 2, "meshCount", h.meshCount);
  hexKv(out, hr, 4, 4, "length1", h.length1);
  hexKv(out, hr, 8, 4, "length2", h.length2);
  hexComputedKv(out, "chunkStart", h.chunkStart);
  hexKv(out, hr, 12, 2, "unknown", `0x${h.unknown.toString(16)}`);
  hexKv(out, hr, 14, 1, "reserved1", `0x${h.reserved1.toString(16).padStart(2, "0")}`);
  hexKv(out, hr, 15, 1, "reserved2", `0x${h.reserved2.toString(16).padStart(2, "0")}`);
  hexKv(out, hr, 16, 16, "aabb.min", `[${h.aabb.min[0].toFixed(3)}, ${h.aabb.min[1].toFixed(3)}, ${h.aabb.min[2].toFixed(3)}]`);
  hexKv(out, hr, 32, 16, "aabb.max", `[${h.aabb.max[0].toFixed(3)}, ${h.aabb.max[1].toFixed(3)}, ${h.aabb.max[2].toFixed(3)}]`);
  hexComputedKv(out, "chunks", node.chunks.length);
  for (const [i, mat] of node.materials.entries()) {
    const rf2 = mat.renderFlags2 ? `  flags2=0x${mat.renderFlags2.toString(16)}` : "";
    const bm  = mat.blendMode    ? `  blend=0x${mat.blendMode.toString(16)}`     : "";
    const matStr = `mat[${i}] flags=0x${mat.renderFlags.toString(16).padStart(4, "0")}${rf2}  tex=${mat.textureId}${bm}`;
    if (gShowHex) {
      hexLine(hexPrefix(mat.range, 0, mat.range.size), `mat[${i}]`, `flags=0x${mat.renderFlags.toString(16).padStart(4, "0")}${rf2}  tex=${mat.textureId}${bm}`);
    } else {
      out.log(`  ${matStr}`);
    }
  }
  for (const [i, chunk] of node.chunks.entries()) {
    const ch = chunk.header;
    const cr = ch.range;
    const wide = ch.isWide;
    const strideSize = wide ? 20 : 12;
    if (gShowHex) {
      console.log();
      hexLine(hexBlank(), `--- Chunk[${i}]`, `@0x${chunk.range.begin.toString(16)}`);
    }
    if (!gShowHex) {
      out.push();
      out.h2(`Chunk[${i}] @0x${chunk.range.begin.toString(16)}`);
    }
    hexKv(out, cr, 0, 2, "signature", `0x${ch.signature.toString(16)}`);
    hexKv(out, cr, 2, 1, "materialId", ch.id);
    hexKv(out, cr, 3, 1, "_unknown1", ch._unknown1);
    hexKv(out, cr, 4, 2, "strideCount1", ch.strideCount1);
    hexKv(out, cr, 6, 2, "strideCount2", ch.strideCount2);
    hexKv(out, cr, 8, 1, "primType", `0x${ch.primitiveType.toString(16)}`);
    hexKv(out, cr, 9, 1, "_unknown2", ch._unknown2);
    hexKv(out, cr, 10, 2, "flags", `0x${ch.flags.toString(16).padStart(4, "0")} (${wide ? "WIDE" : "NARROW"})`);
    hexKv(out, cr, 12, 4, "scaling", ch.scaling);
    hexKv(out, cr, 16, 8, "aabb.min", `[${ch.aabb.min[0]}, ${ch.aabb.min[1]}, ${ch.aabb.min[2]}]`);
    hexKv(out, cr, 24, 8, "aabb.max", `[${ch.aabb.max[0]}, ${ch.aabb.max[1]}, ${ch.aabb.max[2]}]`);
    hexComputedKv(out, "strideSize", strideSize);
    hexComputedKv(out, "totalBytes", `${ch.size} + ${ch.strideCount1 * strideSize} + ${ch.strideCount2 * 4} = ${chunk.size}`);
    if (chunk.parseError) out.log(`  PARSE ERROR: ${chunk.parseError}`);

    // Dump raw stride data with all per-stride fields
    const range = chunk.strides.range;
    const n = chunk.strides.length;
    const scale = ch.scaling / 32767.0;
    for (let si = 0; si < n; si++) {
      const base = si * strideSize;
      const byteLen = Math.min(strideSize, range.size - base);
      const prefix = gShowHex
        ? hexPrefix(range, base, byteLen)
        : "   ";
      if (wide) {
        const uvU = range.getFloat32(base + 0);
        const uvV = range.getFloat32(base + 4);
        const nx  = range.getInt8(base + 8);
        const ny  = range.getInt8(base + 9);
        const nz  = range.getInt8(base + 10);
        const pad = range.getUint8(base + 11);
        const vx  = range.getInt16(base + 12);
        const vy  = range.getInt16(base + 14);
        const vz  = range.getInt16(base + 16);
        const unk = range.getInt16(base + 18);
        const pos = `(${(vx * scale).toFixed(3)},${(vy * scale).toFixed(3)},${(vz * scale).toFixed(3)})`;
        const line = `${prefix} s[${si}] uv=(${uvU.toFixed(4)},${uvV.toFixed(4)})  n=(${nx},${ny},${nz})  pad=${pad}  ${pos}  unk=${unk}`;
        if (gShowHex) console.log(line); else out.log(line);
      } else {
        const u  = range.getUint8(base + 0);
        const v  = range.getUint8(base + 1);
        const nx = range.getInt8(base + 2);
        const ny = range.getInt8(base + 3);
        const nz = range.getInt8(base + 4);
        const pad = range.getUint8(base + 5);
        const vx = range.getInt16(base + 6);
        const vy = range.getInt16(base + 8);
        const vz = range.getInt16(base + 10);
        const sentinel = vx === 32767 || vx === -32768 || vy === 32767 || vy === -32768 || vz === 32767 || vz === -32768;
        const pos = sentinel
          ? "(sentinel)"
          : `(${(vx * scale).toFixed(3)},${(vy * scale).toFixed(3)},${(vz * scale).toFixed(3)})`;
        const line = `${prefix} s[${si}] uv=(${u},${v})  n=(${nx},${ny},${nz})  pad=${pad}  ${pos}`;
        if (gShowHex) console.log(line); else out.log(line);
      }
    }
    // Dump leftover bytes after last full stride
    const usedBytes = n * strideSize;
    const leftover = range.size - usedBytes;
    if (leftover > 0) {
      const lfPrefix = gShowHex ? hexPrefix(range, usedBytes, leftover) : "   ";
      const lfLine = `${lfPrefix} leftover ${leftover} bytes`;
      if (gShowHex) console.log(lfLine); else out.log(lfLine);
    }
    if (!gShowHex) out.pop();
  }
  if (node.parseErrors.length > 0) {
    for (const e of node.parseErrors) out.log(`  PARSE ERROR: ${e}`);
  }
}

function dumpMesh(out: Output, node: VexxNodeMesh) {
  const h = node.info;
  out.kv("meshType", `0x${h.type.toString(16)}`);
  out.kv("meshCount", h.meshCount);
  out.kv("length1", h.length1);
  out.kv("length2", h.length2);
  out.kv("unknown", `0x${h.unknown.toString(16)}`);
  out.kv("reserved1", `0x${h.reserved1.toString(16).padStart(2, "0")}`);
  out.kv("reserved2", `0x${h.reserved2.toString(16).padStart(2, "0")}${h.reserved2 === 0xff ? " (external ref)" : ""}`);
  out.kv("aabb.min", `[${h.aabb.min[0].toFixed(3)}, ${h.aabb.min[1].toFixed(3)}, ${h.aabb.min[2].toFixed(3)}]`);
  out.kv("aabb.max", `[${h.aabb.max[0].toFixed(3)}, ${h.aabb.max[1].toFixed(3)}, ${h.aabb.max[2].toFixed(3)}]`);

  if (node.isExternal) {
    out.kv("externalId", node.externalId);
    out.kv("chunkLinks", node.chunkLinks.length);
    for (const [i, lnk] of node.chunkLinks.entries()) {
      out.push();
      out.h2(`LinkChunk[${i}] @0x${lnk.range.begin.toString(16)}`);
      out.kv("unknown3", lnk.unknown3);
      out.kv("maybe_uv", `(${lnk.maybe_uv.x.toFixed(4)}, ${lnk.maybe_uv.y.toFixed(4)})`);
      out.kv("maybe_quat1", `(${lnk.maybe_quat1.x}, ${lnk.maybe_quat1.y}, ${lnk.maybe_quat1.z}, ${lnk.maybe_quat1.w})`);
      out.kv("maybe_quat2", `(${lnk.maybe_quat2.x}, ${lnk.maybe_quat2.y}, ${lnk.maybe_quat2.z}, ${lnk.maybe_quat2.w})`);
      out.pop();
    }
  } else {
    for (const [i, mat] of node.materials.entries()) {
      const rf2 = mat.renderFlags2 ? `  flags2=0x${mat.renderFlags2.toString(16)}` : "";
      const bm  = mat.blendMode    ? `  blend=0x${mat.blendMode.toString(16)}`     : "";
      out.log(`  mat[${i}] flags=0x${mat.renderFlags.toString(16).padStart(4, "0")}${rf2}  tex=${mat.textureId}${bm}`);
    }
    out.kv("chunks", node.chunks.length);
    for (const [i, chunk] of node.chunks.entries()) {
      out.push();
      const ch = chunk.header;
      out.h2(`Chunk[${i}] @0x${chunk.range.begin.toString(16)}`);
      out.kv("signature", `0x${ch.signature.toString(16)}`);
      out.kv("materialId", ch.id);
      out.kv("primType", `${ch.primitiveType} (${primTypeName(ch.primitiveType)})`);
      out.kv("vtxdef", `0x${ch.vtxdef.toString(16)}`);
      out.kv("strideInfo", JSON.stringify(ch.strideInfo));
      out.kv("strideSize", ch.strideSize);
      out.kv("counts", `${ch.strideCount1} + ${ch.strideCount2}`);
      out.kv("sizes", `size1=${ch.size1} size2=${ch.size2}`);
      out.kv("_unknown1", ch._unknown1);
      out.kv("_unknown2", ch._unknown2);
      out.kv("scaling", chunk.scaling);
      out.kv("unknown", chunk.unknown);
      if (chunk.floats.length > 0) {
        out.kv("floats", `[${chunk.floats.join(", ")}]`);
      }
      out.kv("aabb.min", `[${chunk.aabb.min[0].toFixed(3)}, ${chunk.aabb.min[1].toFixed(3)}, ${chunk.aabb.min[2].toFixed(3)}]`);
      out.kv("aabb.max", `[${chunk.aabb.max[0].toFixed(3)}, ${chunk.aabb.max[1].toFixed(3)}, ${chunk.aabb.max[2].toFixed(3)}]`);
      if (chunk.parseError) out.log(`  PARSE ERROR: ${chunk.parseError}`);
      const raw = chunk.strides.toRawVertexData();
      for (let si = 0; si < raw.valid.length; si++) {
        const p = si * 3;
        const vStr = raw.valid[si]
          ? `(${raw.positions[p].toFixed(3)},${raw.positions[p+1].toFixed(3)},${raw.positions[p+2].toFixed(3)})`
          : "(no vertex)";
        const uvStr = raw.uvs
          ? `  uv=(${raw.uvs[si*2]},${raw.uvs[si*2+1]})`
          : "";
        out.log(`    s1[${si}] ${vStr}${uvStr}`);
      }
      out.pop();
    }
  }
}

function dumpTexture(out: Output, node: VexxNodeTexture) {
  const p = node.properties;
  out.kv("size", `${p.width}x${p.height}`);
  out.kv("bpp", p.bpp);
  out.kv("mipmaps", p.mipmaps);
  out.kv("format", `0x${p.format.toString(16)} (swizzle=${node.swizzle})`);
  out.kv("id", p.id);
  out.kv("cmapSize", p.cmapSize);
  out.kv("dataSize", p.dataSize);
  out.kv("alphaTest", p.alphaTest);
  out.kv("diffuse", `rgba(${p.diffuse.r}, ${p.diffuse.g}, ${p.diffuse.b}, ${p.diffuse.a})`);
  out.kv("external", String(p.external));
  out.kv("name", p.name);
  if (node.bodyRange.size >= 24) {
    out.kv("unk[16-23]", buf2hex(node.bodyRange.getArrayBuffer(16, 8)));
  }
  if (node.bodyRange.size >= 40) {
    out.kv("unk[32-39]", buf2hex(node.bodyRange.getArrayBuffer(32, 8)));
  }
  if (node.bodyRange.size >= 48) {
    out.kv("unk[40-47]", buf2hex(node.bodyRange.getArrayBuffer(40, 8)));
  }
  if (node.bodyRange.size >= 56) {
    out.kv("unk[52-55]", buf2hex(node.bodyRange.getArrayBuffer(52, 4)));
  }
}

function dumpCamera(out: Output, node: VexxNodeCamera) {
  const p = node.properties;
  out.kv("unknown1", `0x${p.unknown1.toString(16)}`);
  out.kv("unknown2", `0x${p.unknown2.toString(16)}`);
  out.kv("unknown3", `0x${p.unknown3.toString(16)}`);
  out.kv("frameDur", `${p.frameDuration} (~${(1 / p.frameDuration).toFixed(1)} fps)`);
  out.kv("unknown5", p.unknown5);
  out.kv("unknown6", p.unknown6);
  out.kv("unknown7", p.unknown7);
  out.kv("unknown8", p.unknown8);
  out.kv("unknown9", p.unknown9);
  out.kv("unknown10", p.unknown10);
}

function dumpSection(out: Output, node: VexxNodeSection) {
  const p = node.properties;
  out.kv("name", p.name);
  out.kv("sectionId", `0x${p.sectionId.toString(16).padStart(4, "0")}  (index ${node.sectionIndex})`);
  out.kv("woTrackData", `0x${p.woTrackData.toString(16).padStart(8, "0")}`);
  const pvsBitsLow  = [...Array(32)].map((_,i) => p.pvsMaskLow  >> i & 1 ? i      : null).filter(x => x !== null);
  const pvsBitsHigh = [...Array(32)].map((_,i) => p.pvsMaskHigh >> i & 1 ? i + 32 : null).filter(x => x !== null);
  const pvsBits = [...pvsBitsLow, ...pvsBitsHigh];
  out.kv("pvsMaskLow",  `0x${p.pvsMaskLow.toString(16).padStart(8, "0")}`);
  if (p.pvsMaskHigh) out.kv("pvsMaskHigh", `0x${p.pvsMaskHigh.toString(16).padStart(8, "0")}`);
  out.kv("pvsFrom", pvsBits.length ? `[${pvsBits.join(", ")}]` : "(never)");
  out.kv("aabb.min", `[${p.aabb.min[0].toFixed(3)}, ${p.aabb.min[1].toFixed(3)}, ${p.aabb.min[2].toFixed(3)}]`);
  out.kv("aabb.max", `[${p.aabb.max[0].toFixed(3)}, ${p.aabb.max[1].toFixed(3)}, ${p.aabb.max[2].toFixed(3)}]`);
}

function dumpSound(out: Output, node: VexxNodeSound) {
  const p = node.properties;
  out.kv("name1", `"${p.name1}"`);
  out.kv("name2", `"${p.name2}"`);
  out.kv("unknown1", p.unknown1);
  out.kv("unknown2", p.unknown2);
  out.kv("unknown3", buf2hex(p.unknown3));
}

function dumpLensFlare(out: Output, node: VexxNodeLensFlare) {
  const m = node.matrix;
  out.log(
    `matrix:\n` +
    `  [${m[0].toFixed(3)}, ${m[1].toFixed(3)}, ${m[2].toFixed(3)}, ${m[3].toFixed(3)}]\n` +
    `  [${m[4].toFixed(3)}, ${m[5].toFixed(3)}, ${m[6].toFixed(3)}, ${m[7].toFixed(3)}]\n` +
    `  [${m[8].toFixed(3)}, ${m[9].toFixed(3)}, ${m[10].toFixed(3)}, ${m[11].toFixed(3)}]\n` +
    `  [${m[12].toFixed(3)}, ${m[13].toFixed(3)}, ${m[14].toFixed(3)}, ${m[15].toFixed(3)}]`
  );
  out.kv("unknown", buf2hex(node.unknown));
}

function dumpAnimTransform(out: Output, node: VexxNodeAnimTransform) {
  out.kv("reserved", node.reserved);
  out.kv("count1", node.count1);
  out.kv("count2", node.count2);
  out.kv("has_position", node.has_position);
  out.kv("track1_end", node.track1_end);
  out.kv("track1_start", node.track1_start);
  if (node.has_position) {
    out.kv("pos", `(${node.x.toFixed(3)}, ${node.y.toFixed(3)}, ${node.z.toFixed(3)})`);
    out.kv("scale", `(${node.sx.toFixed(1)}, ${node.sy.toFixed(1)}, ${node.sz.toFixed(1)})`);
  }
  if (node.track1) {
    out.kv("track1.keys", `[${node.track1.keys.slice(0, 8).join(", ")}${node.track1.keys.length > 8 ? "…" : ""}] (${node.track1.keys.length})`);
  }
  if (node.track2) {
    out.kv("track2.keys", `[${node.track2.keys.slice(0, 8).join(", ")}${node.track2.keys.length > 8 ? "…" : ""}] (${node.track2.keys.length})`);
  }
}

function dumpCollision(out: Output, node: VexxNodeCollision) {
  out.kv("signature", `0x${node.signature.toString(16)}`);
  out.kv("blockCount", node.blockCount);
  for (const [i, block] of node.blocks.entries()) {
    out.log(`  block[${i}]: ${block.blockCount} sub-blocks`);
    for (const [j, pts] of block.blocks.entries()) {
      out.log(`    sub[${j}]: type=${pts.type} pointSize=${pts.pointSize} count=${pts.pointsCount}`);
    }
  }
}

function dumpWoPoint(out: Output, node: VexxNodeWoPoint) {
  out.kv("rgba", `[${Array.from(node.rgba).map((v) => v.toFixed(3)).join(", ")}]`);
  out.kv("nearAtten", node.nearAttenuation.toFixed(3));
  out.kv("farAtten", node.farAttenuation.toFixed(3));
}

function dumpWoSpot(out: Output, node: VexxNodeWoSpot) {
  out.kv("rgba", `[${Array.from(node.rgba).map((v) => v.toFixed(3)).join(", ")}]`);
  out.kv("nearAtten", node.nearAttenuation.toFixed(3));
  out.kv("farAtten", node.farAttenuation.toFixed(3));
  out.kv("innerCone", `${node.innerConeAngle.toFixed(4)} rad (${(node.innerConeAngle * 57.296).toFixed(1)}°)`);
  out.kv("outerCone", `${node.outerConeAngle.toFixed(4)} rad (${(node.outerConeAngle * 57.296).toFixed(1)}°)`);
}

function dumpWoTrack(out: Output, node: VexxNodeWoTrack) {
  out.kv("sectionCount", node.sectionCount);
  out.kv("lanes", node.lanes.length);
  for (const [i, lane] of node.lanes.entries()) {
    out.log(`  lane[${i}]: points=${lane.pointCount}  scale=${lane.scale.toFixed(4)}`);
  }
  out.kv("totalPoints", node.points.length);
  const circuit = node.circuitPoints;
  const show = Math.min(circuit.length, 5);
  const v3 = (arr: ArrayLike<number>) => `(${arr[0].toFixed(3)}, ${arr[1].toFixed(3)}, ${arr[2].toFixed(3)})`;
  for (let i = 0; i < show; i++) {
    const p = circuit[i];
    out.log(`  [${i}] pos=${v3(p.position)}`);
    out.log(`       right=${v3(p.right)}`);
    out.log(`       down=${v3(p.down)}`);
    out.log(`       fwd=${v3(p.forward)}`);
    out.log(`       param=${p.param.toFixed(6)} left=${p.leftMetric.toFixed(3)} right=${p.rightMetric.toFixed(3)}`);
    out.log(`       unk0=${p._unknown0.toFixed(4)} unk1=${p._unknown1.toFixed(4)}`);
    out.log(`       tailMeta=${buf2hex(p._tailMeta, 28)}`);
  }
  if (circuit.length > show) { out.log(`  ... (${circuit.length - show} more points)`); }
}

function dumpQuake(out: Output, node: VexxNodeQuake) {
  out.kv("sectionCount", node.sectionCount);
  out.kv("unknown", node.unknown);
}

function dumpFogCube(out: Output, node: VexxNodeFogCube) {
  const [px, py, pz] = node.position;
  const [hx, hy, hz] = node.halfExtents;
  out.kv("position", `(${px.toFixed(3)}, ${py.toFixed(3)}, ${pz.toFixed(3)})`);
  out.kv("halfExtents", `(${hx.toFixed(4)}, ${hy.toFixed(4)}, ${hz.toFixed(4)})`);
  for (let i = 0; i < 2; i++) {
    const z = node.fogZones[i];
    const [r, g, b] = z.color;
    out.kv(`zone[${i}].color`, `[${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}]`);
    out.kv(`zone[${i}].near`, z.near.toFixed(2));
    out.kv(`zone[${i}].far`,  z.far.toFixed(2));
  }
  out.kv("unknown0", node.unknown0.toFixed(2));
  out.kv("unknown1", node.unknown1.toFixed(2));
}

function dumpLodGroup(out: Output, node: VexxNodeLodGroup) {
  const m = node.matrix;
  out.log(
    `matrix:\n` +
    `  [${m[0].toFixed(3)}, ${m[1].toFixed(3)}, ${m[2].toFixed(3)}, ${m[3].toFixed(3)}]\n` +
    `  [${m[4].toFixed(3)}, ${m[5].toFixed(3)}, ${m[6].toFixed(3)}, ${m[7].toFixed(3)}]\n` +
    `  [${m[8].toFixed(3)}, ${m[9].toFixed(3)}, ${m[10].toFixed(3)}, ${m[11].toFixed(3)}]\n` +
    `  [${m[12].toFixed(3)}, ${m[13].toFixed(3)}, ${m[14].toFixed(3)}, ${m[15].toFixed(3)}]`
  );
  if (node.bodyRange.size >= 80) {
    out.kv("unk[64-79]", buf2hex(node.bodyRange.getArrayBuffer(64, 16)));
  }
  if (node.lodCount > 0) {
    out.kv("lodCount", node.lodCount);
    out.kv("lodDistances", `[${node.lodDistances.map((d) => d.toFixed(2)).join(", ")}]`);
  }
}

function dumpConvexHull(out: Output, node: VexxNodeDynamicShadowOccluder) {
  const fmt3 = (v: ArrayLike<number>) => `(${v[0].toFixed(3)}, ${v[1].toFixed(3)}, ${v[2].toFixed(3)})`;
  out.kv("verts", node.vertCount);
  out.kv("faces", node.faceCount);
  for (const [i, v] of node.vertices.entries()) {
    out.log(`  v[${i}] = ${fmt3(v)}`);
  }
  for (const [i, f] of node.faces.entries()) {
    out.log(`  face[${i}] n=${fmt3(f.normal)}  idx=[${f.indices.join(", ")}]`);
  }
}

// ─── Tree rendering ───────────────────────────────────────────────────────────

/**
 * Walk the scene graph, showing hierarchy with compact lines.
 * When a node's type matches the filter, emit its full detail block.
 * Without a filter, show compact one-liners for every node.
 */
function renderTree(
  out: Output,
  node: VexxNode,
  opts: { filter: string | null; noTree: boolean },
  prefix = "",
  isLast = true
) {
  const { filter, noTree } = opts;
  const normalize = (s: string) => s.toLowerCase().replace(/_/g, "");
  const matches = filter === null || normalize(node.typeName).includes(normalize(filter));

  if (!noTree) {
    // Always print the tree line so hierarchy is visible
    const connector = isLast ? "└─" : "├─";
    const typeTag = `[${node.typeName}]`;
    const loc = `@0x${node.range.begin.toString(16)}`;
    console.log(`${prefix}${connector} ${typeTag} ${node.name} ${loc} (data:${node.header.dataLength})`);
  }

  if (matches) {
    if (noTree) {
      const typeTag = `[${node.typeName}]`;
      const loc = `@0x${node.range.begin.toString(16)}`;
      out.h2(`${typeTag} ${node.name} ${loc}`);
    }
    const detailPrefix = noTree ? "" : prefix + (isLast ? "   " : "│  ");
    const detailOut = new Output();
    // Indent detail relative to tree branch
    for (let i = 0; i < detailPrefix.length; i += 1) {
      detailOut.push(1);
    }
    dumpNodeDetail(detailOut, node);
    out.br();
  }

  const childPrefix = noTree ? prefix : prefix + (isLast ? "   " : "│  ");
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const last = i === node.children.length - 1;
    renderTree(out, child, opts, childPrefix, last);
  }
}

// ─── Type inventory ───────────────────────────────────────────────────────────

function countTypes(vexx: Vexx): Map<string, number> {
  const counts = new Map<string, number>();
  vexx.traverse((node) => {
    counts.set(node.typeName, (counts.get(node.typeName) ?? 0) + 1);
  });
  return counts;
}

// ─── File loading ─────────────────────────────────────────────────────────────

function loadVexx(file: string): Vexx | null {
  try {
    return Vexx.load(read(file));
  } catch (e: any) {
    console.warn(`[SKIP] ${file}: ${e.message}`);
    return null;
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name("vexx")
  .description("VEXX scene-graph research tool")
  .version("1.0.0");

// ── dump: full tree + optional filter detail ──
program
  .command("dump <files...>")
  .description("Dump scene graph tree (one or more .vex files)")
  .option("-f, --filter <type>", "Only show detail for nodes whose type name contains <type>")
  .option("--no-tree", "Suppress tree lines, only print matching node detail")
  .option("--hex", "Show raw hex bytes alongside stride data")
  .action((files: string[], opts: { filter?: string; tree: boolean; hex?: boolean }) => {
    gShowHex = !!opts.hex;
    const out = new Output();
    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      out.h1(`${file}  (v${vexx.header.version})`);
      out.log(`Nodes: ${vexx.header.nodesSize} bytes  Textures: ${vexx.header.texturesSize} bytes`);
      out.br();
      for (let i = 0; i < vexx.root.children.length; i++) {
        const child = vexx.root.children[i];
        renderTree(out, child, { filter: opts.filter ?? null, noTree: !opts.tree }, "", i === vexx.root.children.length - 1);
      }
    }
  });

// ── scan: glob + inventory ──
program
  .command("scan <dir>")
  .description("Glob all .vex files under <dir> and list node-type counts")
  .option("-f, --filter <type>", "Only show types containing <type>")
  .option("--per-file", "Show per-file breakdown (default: totals only)")
  .action((dir: string, opts: { filter?: string; perFile: boolean }) => {
    const out = new Output();
    const pattern = path.join(dir, "**/*.vex");
    const files = globSync(pattern);
    if (files.length === 0) {
      console.error(`No .vex files found under ${dir}`);
      return;
    }

    const globalCounts = new Map<string, number>();
    const fileCounts: Array<{ file: string; counts: Map<string, number> }> = [];

    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      const counts = countTypes(vexx);
      fileCounts.push({ file, counts });
      for (const [type, count] of counts) {
        globalCounts.set(type, (globalCounts.get(type) ?? 0) + count);
      }
    }

    const applyFilter = (map: Map<string, number>) =>
      opts.filter
        ? new Map([...map].filter(([k]) => k.toLowerCase().includes(opts.filter!.toLowerCase())))
        : map;

    if (opts.perFile) {
      for (const { file, counts } of fileCounts) {
        const filtered = applyFilter(counts);
        if (filtered.size === 0) { continue; }
        out.h1(path.relative(dir, file));
        for (const [type, count] of [...filtered].sort((a, b) => b[1] - a[1])) {
          out.log(`  ${type.padEnd(36)} ${count}`);
        }
        out.br();
      }
    }

    out.h1(`=== TOTALS (${fileCounts.length}/${files.length} files parsed) ===`);
    const filtered = applyFilter(globalCounts);
    for (const [type, count] of [...filtered].sort((a, b) => b[1] - a[1])) {
      out.log(`  ${type.padEnd(36)} ${count}`);
    }
  });

// ── mat-stats: statistical analysis of MeshMaterial bytes ──
program
  .command("mat-stats <dir>")
  .description("Collect statistics on all MeshMaterial 20-byte records across .vex files")
  .action((dir: string) => {
    const out = new Output();
    const pattern = path.join(dir, "**/*.vex");
    const files = globSync(pattern);
    if (files.length === 0) {
      console.error(`No .vex files found under ${dir}`);
      return;
    }

    // word counts per dword offset (0,4,8,12,16)
    const wordCounts: Map<number, number>[] = [0, 4, 8, 12, 16].map(() => new Map());
    // u16 counts at each 2-byte offset
    const u16Counts: Map<number, number>[] = Array.from({ length: 10 }, () => new Map());
    const allRaw: number[][] = [];
    // renderFlags → texture names seen with that flag value
    const flagTexNames = new Map<number, Map<string, number>>();

    let totalFiles = 0;

    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      totalFiles++;
      const textures = vexx.textures;
      vexx.traverse((node) => {
        if (!(node instanceof VexxNodeMesh)) { return; }
        for (const mat of node.materials) {
          const r = (mat as any).range;
          if (!r || r.size < 20) { continue; }
          const raw: number[] = [];
          for (let i = 0; i < 20; i++) { raw.push(r.getUint8(i)); }
          allRaw.push(raw);

          // dword stats
          for (let wi = 0; wi < 5; wi++) {
            const off = wi * 4;
            const val = raw[off] | (raw[off+1] << 8) | (raw[off+2] << 16) | (raw[off+3] << 24);
            const map = wordCounts[wi];
            map.set(val, (map.get(val) ?? 0) + 1);
          }
          // u16 stats
          for (let ui = 0; ui < 10; ui++) {
            const off = ui * 2;
            const val = raw[off] | (raw[off+1] << 8);
            const map = u16Counts[ui];
            map.set(val, (map.get(val) ?? 0) + 1);
          }

          // texture-name correlation
          const flags = mat.renderFlags;
          const tex = textures[mat.textureId] as VexxNodeTexture | undefined;
          const texName = tex ? (tex.properties.name || tex.name || `tex#${mat.textureId}`) : `tex#${mat.textureId}`;
          if (!flagTexNames.has(flags)) { flagTexNames.set(flags, new Map()); }
          const nm = flagTexNames.get(flags)!;
          nm.set(texName, (nm.get(texName) ?? 0) + 1);
        }
      });
    }

    const total = allRaw.length;
    out.h1(`MeshMaterial statistics  (${total} materials in ${totalFiles}/${files.length} files)`);

    // Raw hex dump (first 60)
    const SHOW = Math.min(allRaw.length, 60);
    out.h2(`Raw hex dump (first ${SHOW})`);
    out.log("     off: 00 01 02 03  04 05 06 07  08 09 0a 0b  0c 0d 0e 0f  10 11 12 13");
    for (let m = 0; m < SHOW; m++) {
      const bytes = allRaw[m];
      const parts: string[] = [];
      for (let i = 0; i < 20; i += 4) {
        parts.push(bytes.slice(i, i + 4).map((b) => b.toString(16).padStart(2, "0")).join(" "));
      }
      out.log(`     ${String(m).padStart(3, " ")}: ${parts.join("  ")}`);
    }
    out.br();

    // DWORD stats
    out.h2("DWORD statistics");
    const dwordOffsets = [0, 4, 8, 12, 16] as const;
    for (let wi = 0; wi < 5; wi++) {
      const off = dwordOffsets[wi];
      const map = wordCounts[wi];
      const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
      const unique = sorted.length;
      out.log(`\nbytes [${off}-${off+3}]  (${unique} unique uint32 values):`);
      for (const [val, cnt] of sorted.slice(0, 10)) {
        const u = val >>> 0;
        const pct = ((cnt / total) * 100).toFixed(1);
        const buf = new ArrayBuffer(4);
        const dv = new DataView(buf);
        dv.setUint32(0, u, true);
        const f = dv.getFloat32(0, true);
        const fStr = (f !== 0 && isFinite(f) && Math.abs(f) < 1e6 && Math.abs(f) > 1e-6) ? `  f32=${f.toFixed(4)}` : "";
        out.log(`  0x${u.toString(16).padStart(8, "0")}  (${cnt}/${total} = ${pct}%)${fStr}`);
      }
    }
    out.br();

    // UINT16 stats
    out.h2("UINT16 statistics");
    for (let ui = 0; ui < 10; ui++) {
      const off = ui * 2;
      const map = u16Counts[ui];
      const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
      const unique = sorted.length;
      out.log(`\nbytes [${off}-${off+1}]  (${unique} unique uint16 values):`);
      for (const [val, cnt] of sorted.slice(0, 8)) {
        const pct = ((cnt / total) * 100).toFixed(1);
        out.log(`  0x${val.toString(16).padStart(4, "0")}  (${cnt} = ${pct}%)`);
      }
    }
    out.br();

    // Texture-name correlation: for each renderFlags value, show the most common texture names
    out.h2("renderFlags → texture names (top 8 names per flag value)");
    const sortedFlags = [...flagTexNames.entries()].sort((a, b) => {
      const ca = [...a[1].values()].reduce((s, v) => s + v, 0);
      const cb = [...b[1].values()].reduce((s, v) => s + v, 0);
      return cb - ca;
    });
    for (const [flags, names] of sortedFlags) {
      const flagTotal = [...names.values()].reduce((s, v) => s + v, 0);
      const pct = ((flagTotal / total) * 100).toFixed(1);
      out.log(`\nflags=0x${flags.toString(16).padStart(4, "0")}  (${flagTotal} materials = ${pct}%):`);
      const topNames = [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [name, cnt] of topNames) {
        out.log(`  ${String(cnt).padStart(4)} × ${name}`);
      }
    }
  });

// ── verify-mesh: show all mesh parse errors across .vex files ──
program
  .command("verify-mesh [files...]")
  .description("Report mesh chunk parse errors (size mismatches, bad vtxdefs, …)")
  .option("-d, --dir <dir>", "Scan all .vex files in a directory instead of listing files")
  .option("--large-only", "Only show size-mismatch errors where |delta| > 16 bytes")
  .action((files: string[], opts: { dir?: string; largeOnly: boolean }) => {
    const out = new Output();

    let targets: string[] = [];
    if (opts.dir) {
      const pattern = path.join(opts.dir, "**/*.vex");
      targets = globSync(pattern);
      if (targets.length === 0) { console.error(`No .vex files found under ${opts.dir}`); return; }
    } else if (files.length > 0) {
      targets = files;
    } else {
      console.error("Provide one or more files, or --dir <dir>");
      return;
    }

    let totalNodes = 0;
    let errorNodes = 0;
    const errorsByFile: Array<{ file: string; errors: string[] }> = [];

    for (const file of targets) {
      const vexx = loadVexx(file);
      if (!vexx) continue;

      const fileErrors: string[] = [];

      vexx.traverse((node) => {
        totalNodes++;
        if (node.parseErrors.length === 0) return;

        for (const err of node.parseErrors) {
          // Apply --large-only filter: skip errors where delta ≤ 16 bytes
          if (opts.largeOnly) {
            const m = err.match(/computed=(\d+) declared=(\d+)/);
            if (m) {
              const delta = Math.abs(parseInt(m[1]) - parseInt(m[2]));
              if (delta <= 16) continue;
            }
          }
          fileErrors.push(`[${node.typeName}] ${node.name}: ${err}`);
        }
      });

      if (fileErrors.length > 0) {
        const label = opts.dir ? path.relative(opts.dir, file) : file;
        errorsByFile.push({ file: label, errors: fileErrors });
        errorNodes++;
      }
    }

    for (const { file, errors } of errorsByFile) {
      out.h2(file);
      for (const e of errors) out.log(`  ${e}`);
      out.br();
    }

    out.h1("=== verify-mesh summary ===");
    out.log(`  files scanned  : ${targets.length}`);
    out.log(`  nodes parsed   : ${totalNodes}`);
    out.log(`  files with errors: ${errorNodes}`);
  });

// ── graph: output DOT parent→child type relationships ──
program
  .command("graph <dir>")
  .description("Output a DOT digraph of node type parent→child relationships")
  .action((dir: string) => {
    const pattern = path.join(dir, "**/*.vex");
    const files = globSync(pattern).slice(0, 150);
    const edges = new Map<string, Set<string>>();
    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      vexx.traverse((node) => {
        if (!node.parent) { return; }
        const pName = node.parent.typeName;
        const cName = node.typeName;
        if (!edges.has(pName)) { edges.set(pName, new Set()); }
        edges.get(pName)!.add(cName);
      });
    }
    console.log("digraph G {");
    for (const [parent, children] of edges) {
      for (const child of children) { console.log(`\t${parent} -> ${child};`); }
    }
    console.log("}");
  });

// ── anim: detailed ANIM_TRANSFORM dump ──
program
  .command("anim <files...>")
  .description("Detailed ANIM_TRANSFORM dump (keyframes, raw int16 values, position/scale)")
  .action((files: string[]) => {
    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      vexx.traverse((node) => {
        if (!(node instanceof VexxNodeAnimTransform)) { return; }
        const parentDesc = node.parent ? `${node.parent.typeName} "${node.parent.name}"` : "none";
        const childTypes = node.children.map((c) => c.typeName).join(", ");
        console.log(`\n=== ${node.name} (${file})  parent: ${parentDesc}  children: [${childTypes}] ===`);
        console.log(`  reserved=${node.reserved}  count1=${node.count1}  count2=${node.count2}  has_position=${node.has_position}`);
        console.log(`  track1_end=0x${node.track1_end.toString(16)}  track1_start=0x${node.track1_start.toString(16)}`);
        console.log(`  nodeHeaderSize=${node.header.size}  bodySize=${node.bodyRange.size}`);
        if (node.has_position) {
          console.log(`  position: (${node.x}, ${node.y}, ${node.z})`);
          const body = new DataView(node.bodyRange.buffer);
          const sx = body.getFloat32(32, true);
          const sy = body.getFloat32(36, true);
          const sz = body.getFloat32(40, true);
          console.log(`  scale_bytes: (${sx.toExponential(3)}, ${sy.toExponential(3)}, ${sz.toExponential(3)})`);
          console.log(`  scale*32767: (${(sx * 32767).toFixed(4)}, ${(sy * 32767).toFixed(4)}, ${(sz * 32767).toFixed(4)})`);
        }
        if (node.track1) {
          console.log(`  track1: ${node.track1.keys.length} keys, ${node.track1.values.length} values`);
          console.log(`    keys: [${node.track1.keys.join(", ")}]`);
          const body = new DataView(node.bodyRange.buffer);
          const valStart = node.track1_start + node.count1 * 2;
          const v = node.track1.values;
          for (let i = 0; i < v.length; i += 3) {
            const ri = (i - 3) / 3;
            let rawStr = "";
            if (i >= 3) {
              const rx = body.getInt16(valStart + ri * 3 * 2, true);
              const ry = body.getInt16(valStart + (ri * 3 + 1) * 2, true);
              const rz = body.getInt16(valStart + (ri * 3 + 2) * 2, true);
              rawStr = ` [raw: ${rx}, ${ry}, ${rz}]`;
            }
            console.log(`    val[${i / 3}]: (${v[i]?.toFixed(4)}, ${v[i + 1]?.toFixed(4)}, ${v[i + 2]?.toFixed(4)})${rawStr}`);
          }
        }
        if (node.track2) {
          console.log(`  track2: ${node.track2.keys.length} keys, ${node.track2.values.length} values`);
          console.log(`    keys: [${node.track2.keys.join(", ")}]`);
          const v = node.track2.values;
          for (let i = 0; i < v.length; i += 3) {
            console.log(`    val[${i / 3}]: (${v[i]?.toFixed(4)}, ${v[i + 1]?.toFixed(4)}, ${v[i + 2]?.toFixed(4)})`);
          }
        }
      });
    }
  });

// ── tex-stats: texture alphaTest value distribution ──
program
  .command("tex-stats <dir>")
  .description("Show texture alphaTest value distribution across all .vex files")
  .action((dir: string) => {
    const out = new Output();
    const pattern = path.join(dir, "**/*.vex");
    const files = globSync(pattern);
    if (files.length === 0) { console.error(`No .vex files found under ${dir}`); return; }

    const stats = new Map<number, number>();
    let totalFiles = 0;
    for (const file of files) {
      const vexx = loadVexx(file);
      if (!vexx) { continue; }
      totalFiles++;
      vexx.traverse((node) => {
        if (node instanceof VexxNodeTexture) {
          const v = node.properties.alphaTest;
          stats.set(v, (stats.get(v) ?? 0) + 1);
        }
      });
    }
    out.h1(`alphaTest distribution (${totalFiles}/${files.length} files)`);
    for (const [val, cnt] of [...stats].sort((a, b) => b[1] - a[1])) {
      out.log(`  ${String(val).padEnd(20)} ${cnt}`);
    }
  });

// ── normals: per-vertex normal diagnostic ──

type Vec3 = { x: number; y: number; z: number };
function _dot(a: Vec3, b: Vec3) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function _len(v: Vec3) { return Math.sqrt(_dot(v, v)); }
function _sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function _cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function _normalize(v: Vec3): Vec3 {
  const l = _len(v);
  if (l < 1e-9) { return { x: 0, y: 0, z: 0 }; }
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

type NormalStats = {
  count: number; magSum: number; magMin: number; magMax: number; magSumSq: number; zeroCount: number;
  dotCount: number; dotSum: number; dotMin: number; dotMax: number; dotSumSq: number; negDotCount: number;
};
function makeNormalStats(): NormalStats {
  return { count: 0, magSum: 0, magMin: Infinity, magMax: -Infinity, magSumSq: 0, zeroCount: 0,
           dotCount: 0, dotSum: 0, dotMin: Infinity, dotMax: -Infinity, dotSumSq: 0, negDotCount: 0 };
}
function accumMag(s: NormalStats, mag: number) {
  s.count++; s.magSum += mag; s.magSumSq += mag * mag;
  if (mag < s.magMin) { s.magMin = mag; } if (mag > s.magMax) { s.magMax = mag; }
}
function accumDot(s: NormalStats, d: number) {
  s.dotCount++; s.dotSum += d; s.dotSumSq += d * d;
  if (d < s.dotMin) { s.dotMin = d; } if (d > s.dotMax) { s.dotMax = d; }
  if (d < 0) { s.negDotCount++; }
}
function nsMean(sum: number, count: number) { return count > 0 ? sum / count : 0; }
function nsStddev(sumSq: number, sum: number, count: number) {
  if (count < 2) { return 0; }
  const m = sum / count;
  return Math.sqrt(Math.max(0, sumSq / count - m * m));
}

type ChunkReport = { nodeName: string; vtxdef: number; primitiveType: GU.PrimitiveType; vertexCount: number; stats: NormalStats; faceCount: number };

function analyseNormals(filePath: string): ChunkReport[] {
  const vexx = Vexx.load(read(filePath));
  const reports: ChunkReport[] = [];
  vexx.traverse((node) => {
    if (!(node instanceof VexxNodeMesh)) { return; }
    for (const chunk of node.chunks) {
      const hdr = chunk.header;
      const si = hdr.strideInfo;
      if (si.normal.size === 0 || chunk.strides.length === 0) { continue; }
      const normalScale = si.normal.size === 1 ? 1 / 127.0 : si.normal.size === 2 ? 1 / 32767.0 : 1.0;
      const normals: Vec3[] = chunk.strides.map((s) => {
        const n = s.normal as Vec3;
        return { x: n.x * normalScale, y: n.y * normalScale, z: n.z * normalScale };
      });
      const vertices: Vec3[] = chunk.strides.map((s) => s.vertex as Vec3);
      const stats = makeNormalStats();
      let faceCount = 0;
      for (const n of normals) {
        const mag = _len(n);
        accumMag(stats, mag);
        if (mag < 0.01) { stats.zeroCount++; }
      }
      if (hdr.primitiveType === GU.PrimitiveType.TRIANGLE_STRIP) {
        for (let j = 0; j < vertices.length - 2; j++) {
          const v0 = vertices[j], v1 = vertices[j + 1], v2 = vertices[j + 2];
          if (!v0 || !v1 || !v2) { continue; }
          const faceNorm = j % 2 === 0
            ? _normalize(_cross(_sub(v1, v0), _sub(v2, v0)))
            : _normalize(_cross(_sub(v2, v0), _sub(v1, v0)));
          if (_len(faceNorm) < 0.5) { continue; }
          faceCount++;
          for (const idx of [j, j + 1, j + 2]) {
            const vn = _normalize(normals[idx]);
            if (_len(vn) < 0.01) { continue; }
            accumDot(stats, _dot(vn, faceNorm));
          }
        }
      } else if (hdr.primitiveType === GU.PrimitiveType.TRIANGLES) {
        for (let j = 0; j + 2 < vertices.length; j += 3) {
          const v0 = vertices[j], v1 = vertices[j + 1], v2 = vertices[j + 2];
          if (!v0 || !v1 || !v2) { continue; }
          const faceNorm = _normalize(_cross(_sub(v1, v0), _sub(v2, v0)));
          if (_len(faceNorm) < 0.5) { continue; }
          faceCount++;
          for (const idx of [j, j + 1, j + 2]) {
            const vn = _normalize(normals[idx]);
            if (_len(vn) < 0.01) { continue; }
            accumDot(stats, _dot(vn, faceNorm));
          }
        }
      }
      reports.push({ nodeName: node.name, vtxdef: hdr.vtxdef, primitiveType: hdr.primitiveType, vertexCount: chunk.strides.length, stats, faceCount });
    }
  });
  return reports;
}

function printNormalReports(filePath: string, reports: ChunkReport[], verbose: boolean) {
  if (reports.length === 0) { return; }
  const fmt2 = (n: number) => n.toFixed(3).padStart(8);
  const fmtPct = (n: number, total: number) => total > 0 ? `${((n / total) * 100).toFixed(0).padStart(3)}%` : "  —";
  console.log(`\n${"─".repeat(80)}\nFILE: ${filePath}\n${"─".repeat(80)}`);
  const byVtxdef = new Map<number, NormalStats>();
  for (const r of reports) {
    if (!byVtxdef.has(r.vtxdef)) { byVtxdef.set(r.vtxdef, makeNormalStats()); }
    const agg = byVtxdef.get(r.vtxdef)!;
    const s = r.stats;
    agg.count += s.count; agg.magSum += s.magSum; agg.magSumSq += s.magSumSq;
    agg.magMin = Math.min(agg.magMin, s.magMin); agg.magMax = Math.max(agg.magMax, s.magMax);
    agg.dotCount += s.dotCount; agg.dotSum += s.dotSum; agg.dotSumSq += s.dotSumSq;
    agg.dotMin = Math.min(agg.dotMin, s.dotMin); agg.dotMax = Math.max(agg.dotMax, s.dotMax);
    agg.zeroCount += s.zeroCount; agg.negDotCount += s.negDotCount;
  }
  console.log(`\n  AGGREGATED BY VTXDEF:`);
  console.log(`  ${"vtxdef".padEnd(8)} ${"verts".padStart(6)} ${"mag_mean".padStart(9)} ${"mag_std".padStart(8)} ${"mag_min".padStart(8)} ${"mag_max".padStart(8)} ${"dot_mean".padStart(9)} ${"dot_std".padStart(8)} ${"dot_min".padStart(8)} ${"dot_max".padStart(8)} ${"zeros".padStart(6)} ${"flipped".padStart(8)}`);
  console.log(`  ${"─".repeat(110)}`);
  for (const [vtxdef, s] of byVtxdef) {
    const magMean = nsMean(s.magSum, s.count);
    const dotMean = nsMean(s.dotSum, s.dotCount);
    const dotMinStr = s.dotMin === Infinity ? "     n/a" : fmt2(s.dotMin);
    const dotMaxStr = s.dotMax === -Infinity ? "     n/a" : fmt2(s.dotMax);
    const flippedStr = s.dotCount > 0 ? `${s.negDotCount} (${fmtPct(s.negDotCount, s.dotCount)})` : "n/a";
    console.log(`  0x${vtxdef.toString(16).padEnd(6)} ${String(s.count).padStart(6)} ${fmt2(magMean)} ${fmt2(nsStddev(s.magSumSq, s.magSum, s.count))} ${fmt2(s.magMin)} ${fmt2(s.magMax)} ${fmt2(dotMean)} ${fmt2(nsStddev(s.dotSumSq, s.dotSum, s.dotCount))} ${dotMinStr} ${dotMaxStr} ${String(s.zeroCount).padStart(6)} ${flippedStr.padStart(8)}`);
  }
  if (!verbose) { return; }
  console.log(`\n  PER-CHUNK (${reports.length} chunks with normals):`);
  for (const r of reports) {
    const s = r.stats;
    const dotStr = s.dotCount > 0
      ? `dot: mean=${fmt2(nsMean(s.dotSum, s.dotCount))} min=${fmt2(s.dotMin)} max=${fmt2(s.dotMax)} flipped=${s.negDotCount}`
      : "no face data";
    const zeroStr = s.zeroCount > 0 ? ` ZERO_NORMALS=${s.zeroCount}` : "";
    console.log(`    "${r.nodeName}"  vtxdef=0x${r.vtxdef.toString(16)}  verts=${r.vertexCount}  mag=${fmt2(nsMean(s.magSum, s.count))}  ${dotStr}${zeroStr}`);
  }
}

program
  .command("normals [file]")
  .description("Diagnose per-vertex normals: magnitude, face-alignment, zero/flipped counts")
  .option("-v, --verbose", "Show per-chunk breakdown in addition to per-vtxdef summary")
  .option("--all", "Scan all .vex files under ../project-example/psp/")
  .action((file: string | undefined, opts: { verbose: boolean; all: boolean }) => {
    if (opts.all) {
      const pattern = path.resolve(__dirname, "../../../project-example/psp/**/*.vex");
      const files = globSync(pattern);
      if (files.length === 0) { console.error("No .vex files found under ../project-example/psp/"); process.exit(1); }
      for (const f of files) {
        try {
          const reports = analyseNormals(f);
          if (reports.length > 0) { printNormalReports(f, reports, opts.verbose); }
        } catch (e: any) { console.warn(`SKIP ${f}: ${e.message}`); }
      }
    } else if (file) {
      const abs = path.resolve(file);
      const reports = analyseNormals(abs);
      printNormalReports(abs, reports, opts.verbose);
      if (reports.length === 0) { console.log("No mesh chunks with normals found."); }
    } else {
      program.help();
    }
  });

program.parse(process.argv);
