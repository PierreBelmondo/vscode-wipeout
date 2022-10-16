import { BufferRange } from "../../utils/range";
import { vec4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeAmbientLight extends VexxNode {
  rgba = vec4.fromValues(0.3, 0.3, 0.3, 1.0);

  constructor() {
    super(Vexx4NodeType.AMBIENT_LIGHT);
  }

  override load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
  }
}
