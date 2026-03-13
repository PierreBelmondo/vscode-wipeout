import { vec4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Directional light — direction comes from parent TRANSFORM matrix, data = color only
// Reverse engineering progress: 100%
// Single rgba float32×4 — fully parsed.
export class VexxNodeDirectionalLight extends VexxNode {
  rgba = vec4.fromValues(1, 1, 1, 1);

  constructor() {
    super(Vexx4NodeType.DIRECTIONAL_LIGHT);
  }

  override load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
  }
}
