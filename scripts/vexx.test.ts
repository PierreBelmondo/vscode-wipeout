/**
 * VEXX parser regression tests.
 *
 * Run with:
 *   npm run test:vexx
 */

import * as fs from "fs";
import * as path from "path";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { Vexx } from "@core/formats/vexx";
import { VexxNode } from "@core/formats/vexx/node";
import { VexxNodeSection } from "@core/formats/vexx/v4/section";
import { VexxNodeWoTrack } from "@core/formats/vexx/v4/wo_track";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";

// ─── helpers ──────────────────────────────────────────────────────────────────

const PROJECT_EXAMPLE = path.resolve(__dirname, "../../../project-example");

function readFile(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function findVexFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findVexFiles(full));
    else if (entry.name.endsWith(".vex")) out.push(full);
  }
  return out;
}

function loadVexx(filePath: string): Vexx {
  return Vexx.load(readFile(filePath));
}

function collectParseErrors(vexx: Vexx): string[] {
  const errors: string[] = [];
  vexx.traverse(n => { for (const e of n.parseErrors) errors.push(e); });
  return errors;
}

function findSection(vexx: Vexx, name: string): VexxNodeSection | undefined {
  let found: VexxNodeSection | undefined;
  vexx.traverse(n => {
    if (!found && n instanceof VexxNodeSection && n.properties.name === name) found = n;
  });
  return found;
}

function findWoTrack(vexx: Vexx): VexxNodeWoTrack | undefined {
  let found: VexxNodeWoTrack | undefined;
  vexx.traverse(n => { if (!found && n instanceof VexxNodeWoTrack) found = n; });
  return found;
}

// Paths into the sample data
const PSP_PURE  = path.join(PROJECT_EXAMPLE, "psp/pure/us/1.04/Data");
const PSP_PULSE = path.join(PROJECT_EXAMPLE, "psp/pulse/us/1.00/Data");
const PS2_PULSE = path.join(PROJECT_EXAMPLE, "ps2/pulse/Data");
const PS2_FUSION = path.join(PROJECT_EXAMPLE, "ps2/fusion_unpacked/Data");
const PS3_HD    = path.join(PROJECT_EXAMPLE, "ps3/NPEA00000/USRDIR/data");

// ─── traverse ─────────────────────────────────────────────────────────────────

describe("VexxNode.traverse", () => {
  it("visits root + all descendants (not just direct children)", () => {
    // root → [a, b];  a → [c]
    const root = new VexxNode();
    const a = new VexxNode();
    const b = new VexxNode();
    const c = new VexxNode(); // grandchild
    root.children.push(a, b);
    a.children.push(c);

    const visited: VexxNode[] = [];
    root.traverse(n => visited.push(n));

    assert.equal(visited.length, 4, "traverse must visit all 4 nodes");
    assert.ok(visited.includes(root), "root visited");
    assert.ok(visited.includes(a),    "child a visited");
    assert.ok(visited.includes(b),    "child b visited");
    assert.ok(visited.includes(c),    "grandchild c visited");
  });

  it("forEach only visits direct children (not grandchildren)", () => {
    const root = new VexxNode();
    const a = new VexxNode();
    const b = new VexxNode();
    const c = new VexxNode(); // grandchild
    root.children.push(a, b);
    a.children.push(c);

    const visited: VexxNode[] = [];
    root.forEach(n => visited.push(n));

    assert.equal(visited.length, 2, "forEach must see exactly 2 direct children");
    assert.ok(!visited.includes(root), "root NOT in forEach");
    assert.ok(!visited.includes(c),    "grandchild NOT in forEach");
  });
});

// ─── SECTION PVS ──────────────────────────────────────────────────────────────

describe("VexxNodeSection – Blue Ridge Section_bridge_grass_fudge", () => {
  let section: VexxNodeSection;

  before(() => {
    const file = path.join(PSP_PURE, "Environments/07_Blue_Ridge/track.vex");
    if (!fs.existsSync(file)) return; // skip if sample data absent
    const vexx = loadVexx(file);
    const found = findSection(vexx, "Section_bridge_grass_fudge");
    assert.ok(found, "Section_bridge_grass_fudge not found in Blue Ridge track.vex");
    section = found!;
  });

  it("sectionId = 0x011b → index 27", () => {
    if (!section) return;
    assert.equal(section.properties.sectionId, 0x011b);
    assert.equal(section.sectionIndex, 27);
  });

  it("pvsMaskLow = 0x09001000", () => {
    if (!section) return;
    assert.equal(section.properties.pvsMaskLow, 0x09001000);
  });

  it("pvsMaskHigh = 0 (all sections fit in low word)", () => {
    if (!section) return;
    assert.equal(section.properties.pvsMaskHigh, 0);
  });

  it("isVisibleFrom: true for 12, 24, 27; false for all others", () => {
    if (!section) return;
    assert.ok( section.isVisibleFrom(12), "visible from 12 (Jump)");
    assert.ok( section.isVisibleFrom(24), "visible from 24 (bridgeLookback)");
    assert.ok( section.isVisibleFrom(27), "visible from 27 (self)");
    assert.ok(!section.isVisibleFrom(0),  "NOT visible from 0");
    assert.ok(!section.isVisibleFrom(1),  "NOT visible from 1");
    assert.ok(!section.isVisibleFrom(28), "NOT visible from 28");
    assert.ok(!section.isVisibleFrom(63), "NOT visible from 63");
  });
});

describe("VexxNodeSection – Vineta_K Island_Left (pvsMaskHigh)", () => {
  let section: VexxNodeSection;

  before(() => {
    const file = path.join(PSP_PURE, "Environments/01_Vineta_K/track.vex");
    if (!fs.existsSync(file)) return;
    const vexx = loadVexx(file);
    const found = findSection(vexx, "Island_Left");
    assert.ok(found, "Island_Left not found in Vineta_K track.vex");
    section = found!;
  });

  it("sectionId = 0x0120 → index 32", () => {
    if (!section) return;
    assert.equal(section.properties.sectionId, 0x0120);
    assert.equal(section.sectionIndex, 32);
  });

  it("pvsMaskLow = 0 (section index ≥ 32, lives entirely in high word)", () => {
    if (!section) return;
    assert.equal(section.properties.pvsMaskLow, 0);
  });

  it("pvsMaskHigh = 0x00000001 → visible from index 32 (self) only", () => {
    if (!section) return;
    assert.equal(section.properties.pvsMaskHigh, 0x00000001);
    assert.ok( section.isVisibleFrom(32), "visible from 32 (self)");
    assert.ok(!section.isVisibleFrom(0),  "NOT visible from 0");
    assert.ok(!section.isVisibleFrom(31), "NOT visible from 31");
    assert.ok(!section.isVisibleFrom(33), "NOT visible from 33");
  });
});

// ─── WO_TRACK ─────────────────────────────────────────────────────────────────

describe("VexxNodeWoTrack – Blue Ridge", () => {
  let woTrack: VexxNodeWoTrack;

  before(() => {
    const file = path.join(PSP_PURE, "Environments/07_Blue_Ridge/track.vex");
    if (!fs.existsSync(file)) return;
    woTrack = findWoTrack(loadVexx(file))!;
    assert.ok(woTrack, "WO_TRACK not found");
  });

  it("sectionCount = 259", () => {
    if (!woTrack) return;
    assert.equal(woTrack.sectionCount, 259);
  });

  it("2 lanes", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes.length, 2);
  });

  it("lane[0].pointCount = 408", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes[0].pointCount, 408);
  });

  it("lane[1].pointCount = 397", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes[1].pointCount, 397);
  });

  it("total points loaded = 805", () => {
    if (!woTrack) return;
    assert.equal(woTrack.points.length, 408 + 397);
  });

  it("lanePoints(0) length matches lane[0].pointCount", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanePoints(0).length, woTrack.lanes[0].pointCount);
  });

  it("lanePoints(1) length matches lane[1].pointCount", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanePoints(1).length, woTrack.lanes[1].pointCount);
  });
});

describe("VexxNodeWoTrack – Vineta_K", () => {
  let woTrack: VexxNodeWoTrack;

  before(() => {
    const file = path.join(PSP_PURE, "Environments/01_Vineta_K/track.vex");
    if (!fs.existsSync(file)) return;
    woTrack = findWoTrack(loadVexx(file))!;
    assert.ok(woTrack, "WO_TRACK not found");
  });

  it("sectionCount = 259", () => {
    if (!woTrack) return;
    assert.equal(woTrack.sectionCount, 259);
  });

  it("2 lanes", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes.length, 2);
  });

  it("lane[0].pointCount = 455", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes[0].pointCount, 455);
  });

  it("lane[1].pointCount = 292", () => {
    if (!woTrack) return;
    assert.equal(woTrack.lanes[1].pointCount, 292);
  });
});

// ─── parse smoke tests ────────────────────────────────────────────────────────

type ParseSmokeResult = {
  threw: { file: string; message: string }[];
  errors: { file: string; errors: string[] }[];
};

function smokeTest(root: string): ParseSmokeResult {
  const files = findVexFiles(root);
  const threw: ParseSmokeResult["threw"] = [];
  const errors: ParseSmokeResult["errors"] = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    let vexx: Vexx;
    try {
      vexx = Vexx.load(readFile(file));
    } catch (e: any) {
      threw.push({ file: rel, message: e.message });
      continue;
    }
    const errs = collectParseErrors(vexx);
    if (errs.length > 0) errors.push({ file: rel, errors: errs });
  }
  return { threw, errors };
}

function formatThrew(threw: ParseSmokeResult["threw"]): string {
  return threw.map(t => `  ${t.file}: ${t.message}`).join("\n");
}
function formatErrors(errors: ParseSmokeResult["errors"]): string {
  return errors.map(e => `  ${e.file}: ${e.errors.slice(0, 2).join("; ")}`).join("\n");
}

describe("Parse smoke – PSP Pure", () => {
  if (!fs.existsSync(PSP_PURE)) return;
  const result = smokeTest(PSP_PURE);

  it("no .vex file throws an exception", () => {
    assert.equal(result.threw.length, 0,
      `${result.threw.length} file(s) threw:\n${formatThrew(result.threw)}`);
  });

  it("no .vex file has parse errors", () => {
    assert.equal(result.errors.length, 0,
      `${result.errors.length} file(s) have parse errors:\n${formatErrors(result.errors)}`);
  });
});

describe("Parse smoke – PSP Pulse", () => {
  if (!fs.existsSync(PSP_PULSE)) return;
  const result = smokeTest(PSP_PULSE);

  it("no .vex file throws an exception", () => {
    assert.equal(result.threw.length, 0,
      `${result.threw.length} file(s) threw:\n${formatThrew(result.threw)}`);
  });

  it("no .vex file has parse errors", () => {
    assert.equal(result.errors.length, 0,
      `${result.errors.length} file(s) have parse errors:\n${formatErrors(result.errors)}`);
  });
});

describe("Parse smoke – PS2 Pulse", () => {
  if (!fs.existsSync(PS2_PULSE)) return;
  const result = smokeTest(PS2_PULSE);

  it("no .vex file throws an exception", () => {
    assert.equal(result.threw.length, 0,
      `${result.threw.length} file(s) threw:\n${formatThrew(result.threw)}`);
  });

  it("no .vex file has parse errors", () => {
    assert.equal(result.errors.length, 0,
      `${result.errors.length} file(s) have parse errors:\n${formatErrors(result.errors)}`);
  });
});

describe("Parse smoke – PS2 Fusion", () => {
  if (!fs.existsSync(PS2_FUSION)) return;
  const result = smokeTest(PS2_FUSION);

  it("no .vex file throws an exception", () => {
    assert.equal(result.threw.length, 0,
      `${result.threw.length} file(s) threw:\n${formatThrew(result.threw)}`);
  });

  it("no .vex file has parse errors", () => {
    assert.equal(result.errors.length, 0,
      `${result.errors.length} file(s) have parse errors:\n${formatErrors(result.errors)}`);
  });
});

describe("Parse smoke – PS3 HD", () => {
  if (!fs.existsSync(PS3_HD)) return;
  const result = smokeTest(PS3_HD);

  it("no .vex file throws an exception", () => {
    assert.equal(result.threw.length, 0,
      `${result.threw.length} file(s) threw:\n${formatThrew(result.threw)}`);
  });

  it("no .vex file has parse errors", () => {
    assert.equal(result.errors.length, 0,
      `${result.errors.length} file(s) have parse errors:\n${formatErrors(result.errors)}`);
  });
});
