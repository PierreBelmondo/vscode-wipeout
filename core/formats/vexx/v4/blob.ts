import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 0%
// Body is 2–7 KB of geometry data, content not yet parsed.
export class VexxNodeBlob extends VexxNode {
  constructor() {
    super(Vexx4NodeType.BLOB);
  }
}
