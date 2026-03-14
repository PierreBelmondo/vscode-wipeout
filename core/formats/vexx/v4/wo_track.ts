import { vec4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// ─── constants ────────────────────────────────────────────────────────────────

const MAGIC = 0x574f7464; // "WOtd" stored as LE uint32


const LANE_GRAPH_NONE = 0x7fffffff; // sentinel meaning "no adjacent lane"

// ─── types ────────────────────────────────────────────────────────────────────

export type WoTrackLane = {
  /** Number of track points in this lane. */
  pointCount: number;
  /** Average metric (half-width or similar) reported by the file. */
  scale: number;
  _unknown0: number; // +8 (always 0 in observed data)
  /**
   * Index into the laneGraph table for the "next" direction neighbour of this lane.
   * -1 when absent (encoded as 0x7fffffff).
   */
  nextLaneGraphIdx: number; // +12
  /**
   * Index into the laneGraph table for the "previous" direction neighbour of this lane.
   * -1 when absent.
   */
  prevLaneGraphIdx: number; // +16
  _unknown1: number; // +20 (always 0)
  _unknown2: number; // +24 (always 0)
  _unknown3: number; // +28 (always 0)
};

export type WoTrackPoint = {
  /** World-space center position (xyz, w=0). */
  position: vec4;
  /**
   * Right direction vector (unit, xyz, w=0).
   * Points in the cross-track direction (left-to-right from the driver's view).
   */
  right: vec4;
  /**
   * Down direction vector (unit, xyz, w=0).
   * Points away from the road surface into the track geometry (i.e. -surfaceNormal).
   * Negate to obtain the true surface normal pointing toward the driver.
   */
  down: vec4;
  /**
   * Forward direction vector (unit, xyz, w=0).
   * Direction of travel for this lane.
   */
  forward: vec4;

  // ── tail (partially decoded) ─────────────────────────────────────────────────

  /**
   * Slowly increasing parameter along the lane (cumulative, ~0.001/step).
   * Possibly a normalised arc-length fraction or a curvature accumulator.
   */
  param: number;
  /** Left-side metric (wall distance or edge coordinate — exact meaning TBD). */
  leftMetric: number;
  /** Right-side metric (wall distance or edge coordinate — exact meaning TBD). */
  rightMetric: number;
  _unknown0: number; // +76 (small negative float)
  _unknown1: number; // +80 (small positive float ~7)
  /** Remaining tail bytes after +84 — 28 bytes for PSP/PS2, 12 bytes for PSVita. */
  _tailMeta: ArrayBuffer;
};

// ─── lane descriptor ──────────────────────────────────────────────────────────

export class WoTrackLaneDesc implements WoTrackLane {
  range = new BufferRange();
  pointCount = 0;
  scale = 0;
  _unknown0 = 0;
  nextLaneGraphIdx = -1;
  prevLaneGraphIdx = -1;
  _unknown1 = 0;
  _unknown2 = 0;
  _unknown3 = 0;

  static readonly STRIDE = 32;

  static load(range: BufferRange): WoTrackLaneDesc {
    const ret = new WoTrackLaneDesc();
    ret.range = range.slice(0, WoTrackLaneDesc.STRIDE);
    ret.pointCount = range.getUint32(0);
    ret.scale = range.getFloat32(4);
    ret._unknown0 = range.getUint32(8);
    const rawNext = range.getUint32(12);
    const rawPrev = range.getUint32(16);
    ret.nextLaneGraphIdx = rawNext === LANE_GRAPH_NONE ? -1 : rawNext;
    ret.prevLaneGraphIdx = rawPrev === LANE_GRAPH_NONE ? -1 : rawPrev;
    ret._unknown1 = range.getUint32(20);
    ret._unknown2 = range.getUint32(24);
    ret._unknown3 = range.getUint32(28);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// ─── lane graph ───────────────────────────────────────────────────────────────

export class WoTrackLaneGraph {
  range = new BufferRange();
  /**
   * Adjacency rows — `rows[i]` holds up to 4 lane indices reachable from graph
   * node i. Entries equal to 0x7fffffff are decoded as -1 (no neighbour).
   */
  rows: number[][] = [];

  static readonly ROW_STRIDE = 16; // 4 × u32
  static readonly COLS = 4;

  static load(range: BufferRange, rowCount: number): WoTrackLaneGraph {
    const ret = new WoTrackLaneGraph();
    ret.range = range.slice(0, rowCount * WoTrackLaneGraph.ROW_STRIDE);
    for (let row = 0; row < rowCount; row++) {
      const base = row * WoTrackLaneGraph.ROW_STRIDE;
      const entries: number[] = [];
      for (let col = 0; col < WoTrackLaneGraph.COLS; col++) {
        const v = range.getUint32(base + col * 4);
        entries.push(v === LANE_GRAPH_NONE ? -1 : v);
      }
      ret.rows.push(entries);
    }
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// ─── versioned point loaders ──────────────────────────────────────────────────

/**
 * PSP / PS2 track point — 112 bytes.
 * Tail: param(f32) leftMetric(f32) rightMetric(f32) unk0(f32) unk1(f32) tailMeta(28 bytes)
 */
export class WoTrackPointV4 implements WoTrackPoint {
  range = new BufferRange();
  position: vec4 = [0, 0, 0, 0];
  right: vec4 = [0, 0, 0, 0];
  down: vec4 = [0, 0, 0, 0];
  forward: vec4 = [0, 0, 0, 0];
  param = 0;
  leftMetric = 0;
  rightMetric = 0;
  _unknown0 = 0;
  _unknown1 = 0;
  _tailMeta = new ArrayBuffer(0);

  static readonly STRIDE = 112;

  static load(range: BufferRange): WoTrackPointV4 {
    const ret = new WoTrackPointV4();
    ret.range = range.slice(0, WoTrackPointV4.STRIDE);
    ret.position = range.getFloat32Array(0, 4) as unknown as vec4;
    ret.right = range.getFloat32Array(16, 4) as unknown as vec4;
    ret.down = range.getFloat32Array(32, 4) as unknown as vec4;
    ret.forward = range.getFloat32Array(48, 4) as unknown as vec4;
    ret.param = range.getFloat32(64);
    ret.leftMetric = range.getFloat32(68);
    ret.rightMetric = range.getFloat32(72);
    ret._unknown0 = range.getFloat32(76);
    ret._unknown1 = range.getFloat32(80);
    ret._tailMeta = range.getArrayBuffer(84, 28);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

/**
 * PSVita track point — 96 bytes.
 * Identical layout up to +84; the trailing 16 bytes present in PSP/PS2 are absent.
 */
export class WoTrackPointV6 implements WoTrackPoint {
  range = new BufferRange();
  position: vec4 = [0, 0, 0, 0];
  right: vec4 = [0, 0, 0, 0];
  down: vec4 = [0, 0, 0, 0];
  forward: vec4 = [0, 0, 0, 0];
  param = 0;
  leftMetric = 0;
  rightMetric = 0;
  _unknown0 = 0;
  _unknown1 = 0;
  _tailMeta = new ArrayBuffer(0);

  static readonly STRIDE = 96;

  static load(range: BufferRange): WoTrackPointV6 {
    const ret = new WoTrackPointV6();
    ret.range = range.slice(0, WoTrackPointV6.STRIDE);
    ret.position = range.getFloat32Array(0, 4) as unknown as vec4;
    ret.right = range.getFloat32Array(16, 4) as unknown as vec4;
    ret.down = range.getFloat32Array(32, 4) as unknown as vec4;
    ret.forward = range.getFloat32Array(48, 4) as unknown as vec4;
    ret.param = range.getFloat32(64);
    ret.leftMetric = range.getFloat32(68);
    ret.rightMetric = range.getFloat32(72);
    ret._unknown0 = range.getFloat32(76);
    ret._unknown1 = range.getFloat32(80);
    ret._tailMeta = range.getArrayBuffer(84, 12);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// ─── lane table ───────────────────────────────────────────────────────────────

export class WoTrackLaneTable {
  range = new BufferRange();
  descs: WoTrackLaneDesc[] = [];

  static load(range: BufferRange, laneCount: number): WoTrackLaneTable {
    const ret = new WoTrackLaneTable();
    ret.range = range.slice(0, laneCount * WoTrackLaneDesc.STRIDE);
    for (let i = 0; i < laneCount; i++) {
      const laneOffset = i * WoTrackLaneDesc.STRIDE;
      const laneRange  = range.slice(laneOffset);
      ret.descs.push(WoTrackLaneDesc.load(laneRange));
    }
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// ─── point table ──────────────────────────────────────────────────────────────

export class WoTrackPointTable {
  range = new BufferRange();
  points: WoTrackPoint[] = [];

  /**
   * Stride detection: PSVita uses 96 bytes/point, PSP/PS2 uses 112.
   * Determined from the total byte count of the point data region.
   */
  static load(range: BufferRange, totalPoints: number): WoTrackPointTable {
    const ret = new WoTrackPointTable();
    const Point = totalPoints > 0 && range.size === totalPoints * WoTrackPointV6.STRIDE
      ? WoTrackPointV6
      : WoTrackPointV4;
    ret.range = range.slice(0, totalPoints * Point.STRIDE);
    for (let i = 0; i < totalPoints; i++) {
      const base       = i * Point.STRIDE;
      if (base + Point.STRIDE > range.size) break;
      const pointRange = range.slice(base);
      ret.points.push(Point.load(pointRange));
    }
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// ─── node ─────────────────────────────────────────────────────────────────────

// Reverse engineering progress: 60%
// sectionCount, lanes (pointCount + scale + graph indices), laneGraph adjacency table,
// position/right/down/forward per point: all decoded.
// param (arc-length accumulator?), leftMetric/rightMetric (exact meaning TBD),
// _unknown0/_unknown1 (small floats per point), _unknown (48-byte header region +16..+63),
// and _tailMeta (28-byte PSP/PS2 / 12-byte PSVita tail) not yet decoded.
export class VexxNodeWoTrack extends VexxNode {
  /** Number of named SECTIONS (course segments). */
  sectionCount = 0;
  /** Number of lane descriptors. */
  laneCount = 0;
  /** Number of rows in the lane adjacency graph. */
  laneGraphRowCount = 0;
  /** Bytes +16..+63 (48 bytes) — not yet decoded. */
  _unknown = new BufferRange();
  /** Lane descriptors (2 for PSP/PS2, up to 9 for PSVita). */
  laneTable = new WoTrackLaneTable();
  /** Lane adjacency graph — rows referenced by lane nextLaneGraphIdx / prevLaneGraphIdx. */
  laneGraph = new WoTrackLaneGraph();
  /** All track points concatenated (lane[0] points followed by lane[1] points, etc.). */
  pointTable = new WoTrackPointTable();

  constructor() {
    super(Vexx4NodeType.WO_TRACK);
  }

  override load(range: BufferRange): void {
    const magic = range.getUint32(0);
    if (magic !== MAGIC) {
      console.warn(`WO_TRACK: unexpected magic 0x${magic.toString(16)}`);
      return;
    }

    this.sectionCount      = range.getUint32(4);
    this.laneCount         = range.getUint32(8);
    this.laneGraphRowCount = range.getUint32(12);

    this._unknown   = range.slice(16, 64);
    this.laneTable  = WoTrackLaneTable.load(this.laneTableRange, this.laneCount);
    this.laneGraph  = WoTrackLaneGraph.load(this.laneGraphRange, this.laneGraphRowCount);
    const totalPoints = this.laneTable.descs.reduce((s, l) => s + l.pointCount, 0);

    const pointsRange = this.pointsRange;
    if (pointsRange.size < 0) {
      const needed = range.size - pointsRange.size;
      this.parseErrors.push(`body too small: expected at least ${needed} bytes, got ${range.size}`);
      return;
    }

    this.pointTable = WoTrackPointTable.load(pointsRange, totalPoints);
  }

  get laneTableRange(): BufferRange {
    const begin = this._unknown.size + 16;
    return this.bodyRange.slice(begin, begin + this.laneCount * WoTrackLaneDesc.STRIDE);
  }

  get laneGraphRange(): BufferRange {
    return this.bodyRange.slice(this._unknown.size + 16 + this.laneCount * WoTrackLaneDesc.STRIDE);
  }

  get pointsRange(): BufferRange {
    return this.laneGraphRange.slice(this.laneGraphRowCount * WoTrackLaneGraph.ROW_STRIDE);
  }

  /** Convenience accessor — all track points. */
  get points(): WoTrackPoint[] {
    return this.pointTable.points;
  }

  /** Convenience accessor — all lane descriptors. */
  get lanes(): WoTrackLaneDesc[] {
    return this.laneTable.descs;
  }

  /**
   * All points of one complete circuit, in traversal order.
   * The lanes are sequential storage segments — concatenate them to get the
   * full closed loop (last point is adjacent to first).
   */
  get circuitPoints(): WoTrackPoint[] {
    return this.pointTable.points;
  }

  /** Points belonging to storage segment i (0-based). */
  lanePoints(i: number): WoTrackPoint[] {
    let start = 0;
    for (let j = 0; j < i; j++) start += this.laneTable.descs[j]?.pointCount ?? 0;
    const count = this.laneTable.descs[i]?.pointCount ?? 0;
    return this.pointTable.points.slice(start, start + count);
  }
}
