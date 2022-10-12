import { BufferRange } from "../../utils/range";
import { mat4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeLensFlare extends VexxNode {
  properties = {
    matrix: mat4.create(),
    unknown: new ArrayBuffer(16)
  }

  constructor() {
    super(Vexx4NodeType.LENS_FLARE);
  }

  override load(range: BufferRange): void {
    this.properties.matrix = range.getFloat32Array(0, 16);
    this.properties.unknown = range.slice(64).buffer;
  }
}
