import { VexxNode } from "../node";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 0%
// Body is 32 bytes, content not yet parsed.
export class VexxNodePointLight extends VexxNode {
  constructor() {
    super(Vexx6NodeType.POINT_LIGHT);
  }
}