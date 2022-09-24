import { Flat } from "../flat";
import { VexxNodeMesh } from "./mesh";
import { Vexx4NodeType } from "./type";

export class VexxNodeWeaponPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.WEAPON_PAD);
  }

  export() : Flat.Node {
    const ret = super.export();
    ret.type = "WEAPON_PAD";
    return ret;
  }
}
