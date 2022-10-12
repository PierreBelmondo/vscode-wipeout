import { BufferRange } from "../../utils/range";
import { Flat } from "../flat";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

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

  override export(): Flat.Node {
    return {
      type: "SOUND",
      name: this.name,
    }
  }
}
