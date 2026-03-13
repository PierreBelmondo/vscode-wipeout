import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 100%
// Source filename string only — fully parsed.
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
