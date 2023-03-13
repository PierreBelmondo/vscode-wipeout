import { BufferRange } from "@core/utils/range";
import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeLensFlare extends VexxNodeMatrix {
  unknown = new ArrayBuffer(16)

  constructor() {
    super(Vexx4NodeType.LENS_FLARE);
  }

  override load(range: BufferRange): void {
    this.matrix = range.getFloat32Array(0, 16);
    this.unknown = range.slice(64).buffer;
  }
}
