import { BufferRange } from "../../../core/range";
import { vec4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeAmbientLight extends VexxNode {
  rgba = vec4.fromValues(0.3,0.3,0.3,1.0);

  constructor() {
    super(Vexx4NodeType.AMBIENT_LIGHT);
  }

  load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
  }

  /*
  glDraw(engine: Engine): void {
    engine.useProgram("default");
    engine.setUniform4f("color", 1.0, 1.0, 0.2, 0.5);
    engine.setUniformMatrix4fv("model", engine.modelMatrix);
    engine.drawMesh("cube");
  }
  */
}
