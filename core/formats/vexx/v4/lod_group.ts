import { BufferRange } from "@core/utils/range";
import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 70%
// Matrix + lodCount + lodDistances fully parsed; bytes [64..80) unknown (bounding sphere row?),
// bytes [88..95] are runtime pointers (intentionally skipped).
export class VexxNodeLodGroup extends VexxNodeMatrix {
  lodCount = 0;
  // LOD switch distances (screen-space or world-space, one per LOD level after the first)
  lodDistances: number[] = [];

  constructor() {
    super(Vexx4NodeType.LOD_GROUP);
  }

  override load(range: BufferRange): void {
    super.load(range);
    if (range.size > 64) {
      // [64..80)  = unknown (bounding sphere row?)
      // [80..84)  = u32 lodCount
      // [84..88)  = f32 lod distance 0 (near threshold)
      // [88..96)  = runtime pointers (skip)
      // [96..100) = f32 lod distance 1 (far threshold, typically 50.0)
      this.lodCount = range.getUint32(80);
      if (this.lodCount >= 1) this.lodDistances.push(range.getFloat32(84));
      if (this.lodCount >= 2) this.lodDistances.push(range.getFloat32(96));
    }
  }
}
