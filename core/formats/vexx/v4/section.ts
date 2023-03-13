import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";

export class VexxNodeSection extends VexxNode {
  properties = {
    unknown: new ArrayBuffer(16),
    aabb: new AABB(),
    name: "A_",
  };

  constructor() {
    super(Vexx4NodeType.SECTION);
  }

  override load(range: BufferRange): void {
    this.properties.unknown = range.slice(0, 16).buffer;
    this.properties.aabb = AABB.loadFromFloat32(range.slice(16, 48));
    this.properties.name = range.slice(48).getString();
  }
}
