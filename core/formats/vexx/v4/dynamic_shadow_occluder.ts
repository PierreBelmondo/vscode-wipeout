import { vec3 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class ConvexFace {
  normal = vec3.create();
  indices: number[] = [];
}

// DYNAMIC_SHADOW_OCCLUDER — convex hull mesh used for shadow casting.
//
// Data layout (two variants, distinguished by node headerLength):
//
//   [0..4)   u16 faceCount, u16 vertCount
//   [4..80)  preamble: runtime ptrs + AABB (skipped)
//   [80..)   face section: faceCount × 32 bytes each
//              [+0..12)  f32 nx, ny, nz  (unit normal)
//              [+12..16) u32 edgeCount
//              [+16..32) u16[edgeCount] indices, zero-padded to fill 16 bytes
//   [..)     vertex section (immediately after faces):
//              headerLength == 48  →  vertCount × 16 bytes  (f32 w=1, x, y, z)
//              headerLength == 32  →  vertCount × 12 bytes  (f32 x, y, z)
// Reverse engineering progress: 90%
// Convex hull geometry (faces + vertices) fully parsed; preamble [4..80) confirmed as
// runtime pointers + AABB and intentionally skipped.
export class VexxNodeDynamicShadowOccluder extends VexxNode {
  vertCount = 0;
  faceCount = 0;
  faces: ConvexFace[] = [];
  vertices: vec3[] = [];

  constructor() {
    super(Vexx4NodeType.DYNAMIC_SHADOW_OCCLUDER);
  }

  override load(range: BufferRange): void {
    this.faceCount = range.getUint16(0);
    this.vertCount = range.getUint16(2);

    // Vertex size depends on node header length:
    //   headerLength 48  →  16 bytes per vertex (f32 w=1, x, y, z)
    //   headerLength 32  →  12 bytes per vertex (f32 x, y, z, no w)
    const vertStride = this.header.headerLength === 32 ? 12 : 16;
    const vertOffset = vertStride === 16 ? 4 : 0; // skip w=1 field

    const faceStride = 32;
    const faceStart = 80;
    const faceEnd = faceStart + this.faceCount * faceStride;

    for (let f = 0; f < this.faceCount; f++) {
      const off = faceStart + f * faceStride;
      const face = new ConvexFace();
      face.normal = vec3.fromValues(
        range.getFloat32(off),
        range.getFloat32(off + 4),
        range.getFloat32(off + 8),
      );
      const edgeCount = range.getUint32(off + 12);
      for (let e = 0; e < edgeCount && e < 8; e++) {
        face.indices.push(range.getUint16(off + 16 + e * 2));
      }
      this.faces.push(face);
    }

    for (let v = 0; v < this.vertCount; v++) {
      const off = faceEnd + v * vertStride + vertOffset;
      this.vertices.push(vec3.fromValues(
        range.getFloat32(off),
        range.getFloat32(off + 4),
        range.getFloat32(off + 8),
      ));
    }
  }
}
