/**
 * vexx-normals.ts — PSP VEXX normal diagnostic tool
 *
 * For every mesh chunk that carries per-vertex normals this script reports:
 *   • Normal magnitude after Int8/127 normalisation (should be ≈ 1.0)
 *   • Dot product with the computed face normal (positive = outward, negative = flipped)
 *   • Zero-normal count (raw Int8 value = 0,0,0 → effectively no data)
 *   • Uniformity: mean direction vs spread
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/vexx-normals.ts <file.vex>
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/vexx-normals.ts --all  (scans ../project-example/)
 */

import * as fs from "fs";
import * as path from "path";
import { sync as globSync } from "glob";
import { Command } from "commander";

import { Vexx } from "@core/formats/vexx";
import { VexxNode } from "@core/formats/vexx/node";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";
import { GU } from "@core/utils/pspgu";

// ─── helpers ──────────────────────────────────────────────────────────────────

function read(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

type Vec3 = { x: number; y: number; z: number };

function dot(a: Vec3, b: Vec3) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(v: Vec3) { return Math.sqrt(dot(v, v)); }
function sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function normalize(v: Vec3): Vec3 {
  const l = len(v);
  if (l < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// ─── statistics accumulator ────────────────────────────────────────────────────

type Stats = {
  // Magnitude stats — one sample per vertex
  count: number;
  magSum: number; magMin: number; magMax: number; magSumSq: number;
  zeroCount: number;
  // Dot-product stats (vertex normal · face normal) — one sample per vertex-in-triangle
  // (vertices shared between adjacent strip triangles appear multiple times, so we track
  // dotCount separately from count to keep the mean valid)
  dotCount: number;
  dotSum: number; dotMin: number; dotMax: number; dotSumSq: number;
  negDotCount: number;
};

function makeStats(): Stats {
  return {
    count: 0,
    magSum: 0, magMin: Infinity, magMax: -Infinity, magSumSq: 0,
    zeroCount: 0,
    dotCount: 0,
    dotSum: 0, dotMin: Infinity, dotMax: -Infinity, dotSumSq: 0,
    negDotCount: 0,
  };
}

function accumMag(s: Stats, mag: number) {
  s.count++;
  s.magSum += mag;
  s.magSumSq += mag * mag;
  if (mag < s.magMin) s.magMin = mag;
  if (mag > s.magMax) s.magMax = mag;
}

function accumDot(s: Stats, d: number) {
  s.dotCount++;
  s.dotSum += d;
  s.dotSumSq += d * d;
  if (d < s.dotMin) s.dotMin = d;
  if (d > s.dotMax) s.dotMax = d;
  if (d < 0) s.negDotCount++;
}

function mean(sum: number, count: number) { return count > 0 ? sum / count : 0; }
function stddev(sumSq: number, sum: number, count: number) {
  if (count < 2) return 0;
  const m = sum / count;
  return Math.sqrt(Math.max(0, sumSq / count - m * m));
}

// ─── per-file analysis ────────────────────────────────────────────────────────

type ChunkReport = {
  nodeName: string;
  vtxdef: number;
  primitiveType: GU.PrimitiveType;
  vertexCount: number;
  stats: Stats;
  faceCount: number;
};

function analyseFile(filePath: string): ChunkReport[] {
  const buf = read(filePath);
  const vexx = Vexx.load(buf);
  const reports: ChunkReport[] = [];

  function walk(node: VexxNode) {
    if (node instanceof VexxNodeMesh) {
      for (const chunk of node.chunks) {
        const hdr = chunk.header;
        const si = hdr.strideInfo;
        if (si.normal.size === 0) continue;                // no normals in this chunk
        if (chunk.strides.length === 0) continue;

        const normalScale = si.normal.size === 1 ? 1 / 127.0
                          : si.normal.size === 2 ? 1 / 32767.0
                          : 1.0;

        // Collect normalised normals and vertices
        const normals: Vec3[] = chunk.strides.map((s) => {
          const n = s.normal as Vec3;
          return {
            x: n.x * normalScale,
            y: n.y * normalScale,
            z: n.z * normalScale,
          };
        });
        const vertices: Vec3[] = chunk.strides.map((s) => s.vertex as Vec3);

        const stats = makeStats();
        let faceCount = 0;

        // Magnitude check for every vertex normal
        for (const n of normals) {
          const mag = len(n);
          accumMag(stats, mag);
          if (mag < 0.01) stats.zeroCount++;
        }

        // Face-alignment check: build triangles from triangle strip, compare
        // stored vertex normals against computed face normal.
        if (hdr.primitiveType === GU.PrimitiveType.TRIANGLE_STRIP) {
          const vcount = vertices.length;
          for (let j = 0; j < vcount - 2; j++) {
            const v0 = vertices[j];
            const v1 = vertices[j + 1];
            const v2 = vertices[j + 2];
            if (!v0 || !v1 || !v2) continue;

            // Alternating winding for triangle strips
            const faceNorm = j % 2 === 0
              ? normalize(cross(sub(v1, v0), sub(v2, v0)))
              : normalize(cross(sub(v2, v0), sub(v1, v0)));
            if (len(faceNorm) < 0.5) continue; // degenerate face

            faceCount++;
            // Average the three vertex normals vs face normal
            for (const idx of [j, j + 1, j + 2]) {
              const vn = normalize(normals[idx]);
              if (len(vn) < 0.01) continue;
              accumDot(stats, dot(vn, faceNorm));
            }
          }
        } else if (hdr.primitiveType === GU.PrimitiveType.TRIANGLES) {
          const vcount = vertices.length;
          for (let j = 0; j + 2 < vcount; j += 3) {
            const v0 = vertices[j], v1 = vertices[j + 1], v2 = vertices[j + 2];
            if (!v0 || !v1 || !v2) continue;
            const faceNorm = normalize(cross(sub(v1, v0), sub(v2, v0)));
            if (len(faceNorm) < 0.5) continue;
            faceCount++;
            for (const idx of [j, j + 1, j + 2]) {
              const vn = normalize(normals[idx]);
              if (len(vn) < 0.01) continue;
              accumDot(stats, dot(vn, faceNorm));
            }
          }
        }

        reports.push({
          nodeName: node.name,
          vtxdef: hdr.vtxdef,
          primitiveType: hdr.primitiveType,
          vertexCount: chunk.strides.length,
          stats,
          faceCount,
        });
      }
    }
    for (const child of node.children) walk(child);
  }

  walk(vexx.root);
  return reports;
}

// ─── output ───────────────────────────────────────────────────────────────────

function fmt2(n: number) { return n.toFixed(3).padStart(8); }
function fmtPct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(0).padStart(3)}%` : "  —";
}

function printReports(filePath: string, reports: ChunkReport[], verbose: boolean) {
  if (reports.length === 0) return;

  console.log(`\n${"─".repeat(80)}`);
  console.log(`FILE: ${filePath}`);
  console.log(`${"─".repeat(80)}`);

  // Aggregate per vtxdef across this file
  const byVtxdef = new Map<number, Stats>();
  for (const r of reports) {
    if (!byVtxdef.has(r.vtxdef)) byVtxdef.set(r.vtxdef, makeStats());
    const agg = byVtxdef.get(r.vtxdef)!;
    const s = r.stats;
    agg.count        += s.count;
    agg.magSum       += s.magSum;
    agg.magSumSq     += s.magSumSq;
    agg.magMin        = Math.min(agg.magMin, s.magMin);
    agg.magMax        = Math.max(agg.magMax, s.magMax);
    agg.dotCount     += s.dotCount;
    agg.dotSum       += s.dotSum;
    agg.dotSumSq     += s.dotSumSq;
    agg.dotMin        = Math.min(agg.dotMin, s.dotMin);
    agg.dotMax        = Math.max(agg.dotMax, s.dotMax);
    agg.zeroCount    += s.zeroCount;
    agg.negDotCount  += s.negDotCount;
  }

  // Aggregated table header
  console.log(`\n  AGGREGATED BY VTXDEF:`);
  console.log(`  ${"vtxdef".padEnd(8)} ${"verts".padStart(6)} ${"mag_mean".padStart(9)} ${"mag_std".padStart(8)} ${"mag_min".padStart(8)} ${"mag_max".padStart(8)} ${"dot_mean".padStart(9)} ${"dot_std".padStart(8)} ${"dot_min".padStart(8)} ${"dot_max".padStart(8)} ${"zeros".padStart(6)} ${"flipped".padStart(8)}`);
  console.log(`  ${"─".repeat(110)}`);

  for (const [vtxdef, s] of byVtxdef) {
    const magMean = mean(s.magSum, s.count);
    const magStd  = stddev(s.magSumSq, s.magSum, s.count);
    const dotMean = mean(s.dotSum, s.dotCount);
    const dotStd  = stddev(s.dotSumSq, s.dotSum, s.dotCount);
    const dotMinStr = s.dotMin === Infinity  ? "     n/a" : fmt2(s.dotMin);
    const dotMaxStr = s.dotMax === -Infinity ? "     n/a" : fmt2(s.dotMax);

    const flippedStr = s.dotCount > 0 ? `${s.negDotCount} (${fmtPct(s.negDotCount, s.dotCount)})` : "n/a";

    console.log(
      `  0x${vtxdef.toString(16).padEnd(6)} ${String(s.count).padStart(6)} ${fmt2(magMean)} ${fmt2(magStd)} ${fmt2(s.magMin)} ${fmt2(s.magMax)} ${fmt2(dotMean)} ${fmt2(dotStd)} ${dotMinStr} ${dotMaxStr} ${String(s.zeroCount).padStart(6)} ${flippedStr.padStart(8)}`
    );
  }

  if (!verbose) return;

  // Per-chunk breakdown
  console.log(`\n  PER-CHUNK (${reports.length} chunks with normals):`);
  for (const r of reports) {
    const s = r.stats;
    const magMean = mean(s.magSum, s.count);
    const dotMean = mean(s.dotSum, s.dotCount);
    const dotStr  = s.dotCount > 0
      ? `dot: mean=${fmt2(dotMean)} min=${fmt2(s.dotMin)} max=${fmt2(s.dotMax)} flipped=${s.negDotCount}`
      : "no face data";
    const zeroStr = s.zeroCount > 0 ? ` ZERO_NORMALS=${s.zeroCount}` : "";
    console.log(
      `    "${r.nodeName}"  vtxdef=0x${r.vtxdef.toString(16)}  verts=${r.vertexCount}  mag=${fmt2(magMean)}  ${dotStr}${zeroStr}`
    );
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("vexx-normals")
  .description("Diagnose per-vertex normals in PSP VEXX mesh files")
  .option("-v, --verbose", "Show per-chunk breakdown in addition to per-vtxdef summary")
  .option("--all", "Scan all .vex files under ../project-example/psp/")
  .argument("[file]", ".vex file to analyse")
  .action((file: string | undefined, opts: { verbose: boolean; all: boolean }) => {
    if (opts.all) {
      const pattern = path.resolve(__dirname, "../../../project-example/psp/**/*.vex");
      const files = globSync(pattern);
      if (files.length === 0) {
        console.error("No .vex files found under ../project-example/psp/");
        process.exit(1);
      }
      for (const f of files) {
        try {
          const reports = analyseFile(f);
          if (reports.length > 0) printReports(f, reports, opts.verbose);
        } catch (e: any) {
          console.warn(`SKIP ${f}: ${e.message}`);
        }
      }
    } else if (file) {
      const abs = path.resolve(file);
      const reports = analyseFile(abs);
      printReports(abs, reports, opts.verbose);
      if (reports.length === 0) console.log("No mesh chunks with normals found.");
    } else {
      program.help();
    }
  });

program.parse(process.argv);
