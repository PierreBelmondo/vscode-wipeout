import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 100%
// Single float32 radius — fully parsed.
export class VexxNodeShadow extends VexxNode {
  // Shadow softness / falloff radius (single float)
  radius = 0.0;

  constructor() {
    super(Vexx4NodeType.SHADOW);
  }

  override load(range: BufferRange): void {
    this.radius = range.getFloat32(0);
  }
}
