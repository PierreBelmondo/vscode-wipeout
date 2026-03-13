import { vec4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// ─── constants ────────────────────────────────────────────────────────────────

const MAGIC = 0x574f7464; // "WOtd" stored as LE uint32

const LANE_DESC_OFFSET = 64; // first lane descriptor within body
const POINT_STRIDE = 112; // bytes per track point

// ─── types ────────────────────────────────────────────────────────────────────

export type WoTrackLane = {
  /** Number of track points in this lane. */
  pointCount: number;
  /** Average metric (half-width or similar) reported by the file. */
  scale: number;
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

  // ── tail (48 bytes, partially decoded) ──────────────────────────────────────

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
  /** Packed section/type data at tail[+88..+111]. Raw bytes, interpretation TBD. */
  _tailMeta: ArrayBuffer;
};

// ─── node ─────────────────────────────────────────────────────────────────────

// Reverse engineering progress: 50%
// sectionCount, lanes (pointCount + scale), position/right/down/forward per point: all known.
// param (arc-length accumulator?), leftMetric/rightMetric (exact meaning TBD),
// _unknown0/_unknown1 (small floats), and _tailMeta (28-byte tail) not yet decoded.
export class VexxNodeWoTrack extends VexxNode {
  /** Number of named SECTIONS (course segments, e.g. 259 for Vineta_K Pure). */
  sectionCount = 0;
  /**
   * Lane descriptors — typically 2 (forward lane + reverse lane).
   * lane[0].pointCount + lane[1].pointCount = points.length.
   */
  lanes: WoTrackLane[] = [];
  /** All track points concatenated (lane[0] points followed by lane[1] points). */
  points: WoTrackPoint[] = [];

  constructor() {
    super(Vexx4NodeType.WO_TRACK);
  }

  override load(range: BufferRange): void {
    const magic = range.getUint32(0);
    if (magic !== MAGIC) {
      console.warn(`WO_TRACK: unexpected magic 0x${magic.toString(16)}`);
      return;
    }

    this.sectionCount = range.getUint32(4);
    const laneCount = range.getUint32(8);
    // Field at +12 encodes the tail size after the lane descriptors in units of 16 bytes.
    // HEADER_SIZE = lane-desc-offset + laneCount×32 + field12×16
    // e.g. 2 lanes, field12=2 → 64+64+32=160; 3 lanes, field12=3 → 64+96+48=208; 7 lanes, field12=5 → 64+224+80=368
    const field12 = range.getUint32(12);
    const HEADER_SIZE = LANE_DESC_OFFSET + laneCount * 32 + field12 * 16;
    if (range.size < HEADER_SIZE) return;

    // Lane descriptors
    this.lanes = [];
    for (let i = 0; i < laneCount; i++) {
      const off = LANE_DESC_OFFSET + i * 32; // 32-byte lane descriptor
      this.lanes.push({
        pointCount: range.getUint32(off),
        scale: range.getFloat32(off + 4),
      });
    }

    // Track points
    const totalPoints = this.lanes.reduce((s, l) => s + l.pointCount, 0);
    this.points = [];
    for (let i = 0; i < totalPoints; i++) {
      const base = HEADER_SIZE + i * POINT_STRIDE;
      if (base + POINT_STRIDE > range.size) break;

      const pos = range.getFloat32Array(base, 4) as unknown as vec4;
      const right = range.getFloat32Array(base + 16, 4) as unknown as vec4;
      const down = range.getFloat32Array(base + 32, 4) as unknown as vec4;
      const forward = range.getFloat32Array(base + 48, 4) as unknown as vec4;

      const param = range.getFloat32(base + 64);
      const leftMetric = range.getFloat32(base + 68);
      const rightMetric = range.getFloat32(base + 72);
      const _unknown0 = range.getFloat32(base + 76);
      const _unknown1 = range.getFloat32(base + 80);
      const _tailMeta = range.getArrayBuffer(base + 84, 28); // +84..+111

      this.points.push({ position: pos, right, down, forward, param, leftMetric, rightMetric, _unknown0, _unknown1, _tailMeta });
    }
  }

  /**
   * All points of one complete circuit, in traversal order.
   * The lanes are sequential storage segments of the same circuit — concatenate
   * them to get the full closed loop (last point is adjacent to first).
   */
  get circuitPoints(): WoTrackPoint[] {
    return this.points;
  }

  /** Points belonging to storage segment i (0-based). */
  lanePoints(i: number): WoTrackPoint[] {
    let start = 0;
    for (let j = 0; j < i; j++) start += this.lanes[j]?.pointCount ?? 0;
    const count = this.lanes[i]?.pointCount ?? 0;
    return this.points.slice(start, start + count);
  }
}
