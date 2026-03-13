import { mat4, vec3 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// FOG_CUBE — 128 bytes
//
// bytes   0-63 : volumeMatrix — 4×4 float32 TRS.  Diagonal = (sx, sy, sz) half-extents of
//                the fog box; translation row (12,13,14) = centre offset in parent space.
//
// bytes  64-87 : fogZone[0] — 6 float32s
//                  [0-2]  rgb   fog colour (linear, 0-1)
//                  [3]    0.0   (padding / unused alpha)
//                  [4]    near  fog start distance
//                  [5]    far   fog end distance
//
// bytes 88-111 : fogZone[1] — same 6-float layout.
//                When colour/near/far differ from zone 0 this defines a second fog layer
//                (e.g. transition zones in Modesto Heights).
//
// bytes 112-115: unknown float (varies per-cube, possibly precomputed volume/area)
// bytes 116-119: 500.0 (constant across all known files — possibly max fog range)
// bytes 120-127: 0.0, 0.0

export interface FogZone {
  color: vec3;       // linear RGB
  near: number;
  far: number;
}

// Reverse engineering progress: 85%
// volumeMatrix and both fogZones (color/near/far) fully parsed.
// unknown0 (bytes 112-115) and unknown1 (bytes 116-119, constant 500.0) not yet identified.
// Bytes 120-127 confirmed as zeros.
export class VexxNodeFogCube extends VexxNode {
  volumeMatrix = mat4.create();
  fogZones: [FogZone, FogZone] = [
    { color: vec3.fromValues(1, 1, 1), near: 0, far: 1000 },
    { color: vec3.fromValues(1, 1, 1), near: 0, far: 1000 },
  ];
  unknown0 = 0; // bytes 112-115 — purpose unknown
  unknown1 = 0; // bytes 116-119 — always 500.0 in known files

  constructor() {
    super(Vexx4NodeType.FOG_CUBE);
  }

  override load(range: BufferRange): void {
    this.volumeMatrix = range.getFloat32Array(0, 16);

    for (let i = 0; i < 2; i++) {
      const base = 64 + i * 24;
      this.fogZones[i] = {
        color: vec3.fromValues(
          range.getFloat32(base),
          range.getFloat32(base + 4),
          range.getFloat32(base + 8),
        ),
        near: range.getFloat32(base + 16),
        far:  range.getFloat32(base + 20),
        // base+12 is always 0.0 (padding)
      };
    }

    this.unknown0 = range.getFloat32(112);
    this.unknown1 = range.getFloat32(116);
  }

  // Centre of the fog volume in parent space (translation row of volumeMatrix).
  get position(): [number, number, number] {
    return [this.volumeMatrix[12], this.volumeMatrix[13], this.volumeMatrix[14]];
  }

  // Half-extents of the fog box (diagonal of volumeMatrix).
  get halfExtents(): [number, number, number] {
    return [this.volumeMatrix[0], this.volumeMatrix[5], this.volumeMatrix[10]];
  }
}
