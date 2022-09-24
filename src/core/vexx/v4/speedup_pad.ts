import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";
import { Flat } from "../flat";

export class VexxNodeSpeedupPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SPEEDUP_PAD);
  }

  export() : Flat.Node {
    const ret = super.export();
    ret.type = "SPEEDUP_PAD";
    return ret;
  }
}