import { vec4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Spot light (world-space position+direction come from parent TRANSFORM matrix)
// Reverse engineering progress: 100%
// rgba, nearAttenuation, farAttenuation, innerConeAngle, outerConeAngle fully parsed.
export class VexxNodeWoSpot extends VexxNode {
  rgba = vec4.fromValues(1, 1, 1, 1);
  nearAttenuation = 0.0;
  farAttenuation = 0.0;
  innerConeAngle = 0.0; // radians
  outerConeAngle = 0.0; // radians

  constructor() {
    super(Vexx4NodeType.WO_SPOT);
  }

  override load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
    this.nearAttenuation = range.getFloat32(16);
    this.farAttenuation = range.getFloat32(20);
    this.innerConeAngle = range.getFloat32(24);
    this.outerConeAngle = range.getFloat32(28);
  }
}
