import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeWorld extends VexxNode {
  source = "world";

  constructor() {
    super(Vexx4NodeType.WORLD);
    this.header.name = "world";
  }

  override load(data: BufferRange): void {
    this.source = data.getString();
  }
}
