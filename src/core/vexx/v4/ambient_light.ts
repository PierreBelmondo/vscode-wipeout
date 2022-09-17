import { BufferRange } from "../../../core/range";
import { vec4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { Flat } from "../flat";

export class VexxNodeAmbientLight extends VexxNode {
  rgba = vec4.fromValues(0.3, 0.3, 0.3, 1.0);

  constructor() {
    super(Vexx4NodeType.AMBIENT_LIGHT);
  }

  load(range: BufferRange): void {
    this.rgba = range.getFloat32Array(0, 4);
  }

  export(): Flat.Node {
    return {
      type: "AMBIENT_LIGHT",
      name: this.name,
      rgba: {
        r: this.rgba[0],
        g: this.rgba[1],
        b: this.rgba[2],
        a: this.rgba[3],
      },
    };
  }
}
