import { BufferRange } from "../../../core/range";
import { mat4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeLodGroup extends VexxNode {
  matrix: mat4 | null = null;

  constructor() {
    super(Vexx4NodeType.LOD_GROUP);
  }

  load(data: BufferRange) : void  {
    this.matrix = data.getFloat32Array(0, 16);
  }

  /*
  glDraw(engine: Engine): void {
    if (this.matrix) {
      engine.pushModelMatrix();
      mat4.multiply(engine.modelMatrix, engine.modelMatrix, this.matrix);
    }

    if (this.children.length > 0) {
      const child = this.children[0];
      child.glDraw(engine);
    }

    if (this.matrix)
      engine.popModelMatrix();
  }
  */
}
