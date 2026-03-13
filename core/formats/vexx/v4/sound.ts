import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 40%
// name1 and name2 confirmed; unknown1/unknown2 (float32×2) and unknown3 (32 bytes) not decoded.
export class VexxNodeSound extends VexxNode {
  properties = {
    unknown1: 0.0,
    unknown2: 0.0,
    name1: "",
    name2: "",
    unknown3: new ArrayBuffer(32)
  }

  constructor() {
    super(Vexx4NodeType.SOUND);
  }

  override load(range: BufferRange): void {
    this.properties.unknown1 = range.getFloat32(0);
    this.properties.unknown2 = range.getFloat32(4);
    this.properties.name1 = range.slice(8, 16).getString();
    this.properties.name2 = range.slice(16, 32).getString();
    this.properties.unknown3 = range.slice(32,64).buffer;
  }
}
