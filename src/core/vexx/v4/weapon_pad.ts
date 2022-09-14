import { VexxNodeMesh } from "./mesh";
import { Vexx4NodeType } from "./type";

export class VexxNodeWeaponPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.WEAPON_PAD);
  }
}
