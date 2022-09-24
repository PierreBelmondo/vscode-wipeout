import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { Flat } from "../flat";
import { mat4 } from "gl-matrix";

export class VexxNodeTransform extends VexxNode {
  matrix = mat4.create();

  constructor() {
    super(Vexx4NodeType.TRANSFORM);
  }

  override load(data: BufferRange): void {
    if (data.size >= 64) this.matrix = data.getFloat32Array(0, 16);
  }

  override export(): Flat.Node {
    return {
      type: "TRANSFORM",
      name: this.name,
      children: this.exportChildren(),
      matrix: Array.from(this.matrix),
    };
  }
}
