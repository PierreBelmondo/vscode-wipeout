import { BufferRange } from "../../utils/range";
import { mat4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { Flat } from "../flat";

export class VexxNodeStartPosition extends VexxNode {
  matrix = mat4.create();

  constructor() {
    super(Vexx4NodeType.START_POSITION);
  }

  override load(data: BufferRange): void {
    if (data.size == 64) this.matrix = data.getFloat32Array(0, 16);
  }

  override export(): Flat.Node {
    return {
      type: "START_POSITION",
      name: this.name,
      matrix: Array.from(this.matrix),
    };
  }
}
