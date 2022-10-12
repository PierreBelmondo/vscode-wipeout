import { BufferRange } from "../../utils/range";
import { mat4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeLodGroup extends VexxNode {
  matrix: mat4 | null = null;

  constructor() {
    super(Vexx4NodeType.LOD_GROUP);
  }

  override load(data: BufferRange) : void  {
    this.matrix = data.getFloat32Array(0, 16);
  }
}
