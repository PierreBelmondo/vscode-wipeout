import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 0%
// Body is ~4–6 KB of unknown data, content not yet parsed.
export class VexxNodeExitGlow extends VexxNode {
  constructor() {
    super(Vexx4NodeType.EXIT_GLOW);
  }
}
