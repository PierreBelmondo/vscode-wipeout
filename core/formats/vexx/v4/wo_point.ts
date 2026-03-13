import { vec4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Point light (world-space position comes from parent TRANSFORM matrix)
// Reverse engineering progress: 100%
// rgba, nearAttenuation, farAttenuation fully parsed; bytes [24-31] confirmed zeros.
export class VexxNodeWoPoint extends VexxNode {
  rgba = vec4.fromValues(1, 1, 1, 1);
  nearAttenuation = 0.0;
  farAttenuation = 0.0;

  constructor() {
    super(Vexx4NodeType.WO_POINT);
  }

  override load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
    this.nearAttenuation = range.getFloat32(16);
    this.farAttenuation = range.getFloat32(20);
    // bytes 24..31 = zeros (no cone for point light)
  }
}
