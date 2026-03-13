import { VexxNodeMesh } from "./mesh";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 60%
// Inherits VexxNodeMesh; see mesh.ts for detailed progress breakdown.
export class VexxNodeWeaponPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.WEAPON_PAD);
  }
}
