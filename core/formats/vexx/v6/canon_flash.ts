import { VexxNode } from "../node";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 0%
// Body is 64 bytes, content not yet parsed.
export class VexxNodeCanonFlash extends VexxNode {
  constructor() {
    super(Vexx6NodeType.CANON_FLASH);
  }
}