/**
 * TWD format inspector.
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/twd.ts [--hex] [--no-blocks] <file.twd> [...]
 *
 * Options:
 *   --hex        Show absolute address + hex bytes for every field
 *   --no-blocks  Skip the raw hex dump of each data block
 */

import * as fs from "fs";
import { Command } from "commander";
import { BufferRange } from "@core/utils/range";
import { Twd } from "@core/formats/twd";

// ─── I/O ──────────────────────────────────────────────────────────────────────

function read(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
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
    for (const line of text.split("\n")) console.log(`${this.pad()}${line}`);
  }
  br() { console.log(); }
}

// ─── Hex helpers ──────────────────────────────────────────────────────────────

const HEX_COL_WIDTH = 59; // fits 20 bytes (20*3-1=59)
const KEY_COL_WIDTH = 16;

function rangeHex(range: BufferRange, offset: number, length: number): string {
  const parts: string[] = [];
  for (let i = 0; i < length; i++)
    parts.push(range.getUint8(offset + i).toString(16).padStart(2, "0"));
  return parts.join(" ");
}

function hexPrefix(range: BufferRange, offset: number, size: number): string {
  const addr = (range.begin + offset).toString(16).padStart(6, "0");
  const hex  = rangeHex(range, offset, size);
  return `${addr}: ${hex.padEnd(HEX_COL_WIDTH)}`;
}
function hexBlank(): string {
  return " ".repeat(6 + 2 + HEX_COL_WIDTH);
}
function hexLine(prefix: string, key: string, value: string | number) {
  console.log(`${prefix} ${key.padEnd(KEY_COL_WIDTH)} ${value}`);
}

let gHex = false;

function hexKv(out: Output, range: BufferRange, offset: number, size: number, key: string, value: string | number) {
  if (gHex) hexLine(hexPrefix(range, offset, size), key, value);
  else      out.kv(key, value);
}
function hexComputed(out: Output, key: string, value: string | number) {
  if (gHex) hexLine(hexBlank(), key, value);
  else      out.kv(key, value);
}

// ─── Raw hex dump of a data region (16 bytes per row) ─────────────────────────

function hexDump(out: Output, range: BufferRange, maxRows = 0) {
  const size = range.size;
  const rows = Math.ceil(size / 16);
  const limit = maxRows > 0 ? Math.min(rows, maxRows) : rows;
  for (let row = 0; row < limit; row++) {
    const off   = row * 16;
    const n     = Math.min(16, size - off);
    const addr  = (range.begin + off).toString(16).padStart(6, "0");
    const relAddr = off.toString(16).padStart(4, "0");
    const hex   = rangeHex(range, off, n).padEnd(16 * 3 - 1);
    const ascii = Array.from({ length: n }, (_, i) => {
      const b = range.getUint8(off + i);
      return b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".";
    }).join("");
    if (gHex) {
      console.log(`${addr} (+${relAddr}): ${hex}  ${ascii}`);
    } else {
      out.log(`+${relAddr}: ${hex}  ${ascii}`);
    }
  }
  if (maxRows > 0 && rows > maxRows) {
    const remaining = size - maxRows * 16;
    if (gHex) console.log(`${hexBlank()}  ... (${remaining} more bytes, ${rows - maxRows} more rows)`);
    else      out.log(`... (${remaining} more bytes, ${rows - maxRows} more rows)`);
  }
}

// ─── Gap region ───────────────────────────────────────────────────────────────

function hexGap(out: Output, range: BufferRange, offset: number, size: number, label: string) {
  if (size <= 0) return;
  const sub = range.slice(offset, offset + size);
  if (gHex) {
    hexLine(hexPrefix(range, offset, Math.min(size, 20)), `[${label}]`, `${size} bytes`);
    out.push(8 + 2 + HEX_COL_WIDTH + 1 + KEY_COL_WIDTH + 1);
    hexDump(out, sub, 4);
    out.pop(8 + 2 + HEX_COL_WIDTH + 1 + KEY_COL_WIDTH + 1);
  } else {
    out.log(`[${label}]  ${size} bytes`);
    out.push();
    hexDump(out, sub, 4);
    out.pop();
  }
}

// ─── Block dump ───────────────────────────────────────────────────────────────

function dumpBlock(out: Output, data: BufferRange, idx: number, blockType: number) {
  const typeStr = blockType === 0x12 ? "geometry" : blockType === 0x20 ? "collision" : `0x${blockType.toString(16)}`;
  if (gHex) {
    hexLine(hexBlank(), `--- Block[${idx}]`, `@0x${data.begin.toString(16).padStart(6, "0")}  (${data.size} bytes, ${typeStr})`);
  } else {
    out.br();
    out.h2(`Block[${idx}] @0x${data.begin.toString(16).padStart(6, "0")}  (${data.size} bytes, ${typeStr})`);
    out.push();
  }

  hexDump(out, data);

  if (!gHex) out.pop();
}

// ─── Top-level dump ───────────────────────────────────────────────────────────

function dumpFile(out: Output, filePath: string, showBlocks: boolean) {
  const ab = read(filePath);

  if (!Twd.canLoad(ab)) {
    console.error(`${filePath}: not a valid TWD file`);
    return;
  }

  const twd = Twd.load(ab);
  const hr  = twd.headerRange;
  const tr  = twd.tableRange;
  const fr  = twd.fileRange;

  out.h1(filePath);
  out.push();

  // ── Header ──────────────────────────────────────────────────────────────────
  if (gHex) hexLine(hexBlank(), "--- Header", "@0x000000");
  else      out.h2("Header");
  hexKv(out, hr, 0, 4, "version", twd.version);
  hexKv(out, hr, 4, 4, "count",   twd.entries.length);

  // Gap between table end and first data block
  const tableEnd    = 8 + twd.entries.length * 16;
  const firstOff    = twd.entries.length > 0
    ? Math.min(...twd.entries.map(e => e.offset))
    : fr.size;
  if (tableEnd < firstOff) {
    out.br();
    hexGap(out, fr, tableEnd, firstOff - tableEnd, `padding @0x${tableEnd.toString(16)}`);
  }

  out.br();

  // ── Entry table ─────────────────────────────────────────────────────────────
  if (gHex) hexLine(hexBlank(), "--- EntryTable", `@0x${tr.begin.toString(16).padStart(6, "0")}  (${twd.entries.length} × 16 bytes)`);
  else      out.h2("Entry Table");

  for (let i = 0; i < twd.entries.length; i++) {
    const e   = twd.entries[i];
    const er  = e.range;
    const pct = e.bufferSize > 0 ? Math.round(e.dataSize / e.bufferSize * 100) : 0;

    if (gHex) {
      hexLine(hexBlank(), `--- Entry[${i}]`, `@0x${er.begin.toString(16).padStart(6, "0")}`);
    } else {
      out.br();
      out.h2(`Entry[${i}] @0x${er.begin.toString(16).padStart(6, "0")}`);
      out.push();
    }

    hexKv(out, er,  0, 4, "shapeHash",  `0x${e.shapeHash.toString(16).padStart(8, "0")}`);
    hexKv(out, er,  4, 4, "offset",     `0x${e.offset.toString(16).padStart(6, "0")}`);
    hexKv(out, er,  8, 4, "bufferSize", `${e.bufferSize} bytes  (0x${e.bufferSize.toString(16)})`);
    hexKv(out, er, 12, 4, "dataSize",   `${e.dataSize} bytes  (0x${e.dataSize.toString(16)},  ${pct}% of buffer)`);
    hexComputed(out, "blockType", `0x${e.blockType.toString(16).padStart(2, "0")} (${e.isGeometry ? "geometry" : e.isCollision ? "collision" : "unknown"})`);

    if (!gHex) out.pop();
  }

  // ── Inter-block gaps ────────────────────────────────────────────────────────
  const sorted  = [...twd.entries].sort((a, b) => a.offset - b.offset);
  let gapCursor = firstOff;

  for (const e of sorted) {
    if (e.offset > gapCursor) {
      out.br();
      hexGap(out, fr, gapCursor, e.offset - gapCursor, `gap @0x${gapCursor.toString(16)}`);
    }
    gapCursor = e.offset + e.dataSize;
  }

  // Trailing gap after last block
  if (gapCursor < fr.size) {
    out.br();
    hexGap(out, fr, gapCursor, fr.size - gapCursor, `trail @0x${gapCursor.toString(16)}`);
  }

  // ── Data blocks ─────────────────────────────────────────────────────────────
  if (showBlocks) {
    out.br();
    if (gHex) hexLine(hexBlank(), "--- DataBlocks", "");
    else      out.h2("Data Blocks");
    out.push();

    for (let i = 0; i < twd.entries.length; i++) {
      dumpBlock(out, twd.entries[i].data, i, twd.entries[i].blockType);
    }

    out.pop();
  }

  out.pop();
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name("twd")
  .description("TWD format inspector")
  .argument("<files...>", "TWD file(s) to inspect")
  .option("--hex",       "show absolute address + hex bytes for every field")
  .option("--no-blocks", "skip raw hex dump of each data block")
  .action((files: string[], opts) => {
    gHex = !!opts.hex;
    const showBlocks = opts.blocks !== false;
    const out = new Output();
    for (const f of files) {
      dumpFile(out, f, showBlocks);
    }
  });

program.parse(process.argv);
