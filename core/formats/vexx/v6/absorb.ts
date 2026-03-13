import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 100%
// Pure marker node — always dataLength=0; position comes from scene-graph.
export class VexxNodeAbsorb extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.ABSORB);
  }
}