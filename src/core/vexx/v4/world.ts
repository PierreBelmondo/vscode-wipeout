import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeWorld extends VexxNode {
  static readonly type = Vexx4NodeType.WORLD;

  source = "world";

  constructor() {
    super(Vexx4NodeType.WORLD);
    this.header.name = "world";
  }

  load(data: BufferRange): void {
    this.source = data.getString();
  }
}
