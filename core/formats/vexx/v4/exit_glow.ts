import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

// Reverse engineering progress: 60%
// An ordinary Mesh payload (tunnel-exit sun glow, alpha-blended 0x102 blocks);
// inherits VexxNodeMesh, see mesh.ts.
export class VexxNodeExitGlow extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.EXIT_GLOW);
  }
}
