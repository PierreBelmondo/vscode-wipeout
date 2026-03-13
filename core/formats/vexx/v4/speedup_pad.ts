import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

// Reverse engineering progress: 60%
// Inherits VexxNodeMesh; see mesh.ts for detailed progress breakdown.
export class VexxNodeSpeedupPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SPEEDUP_PAD);
  }
}