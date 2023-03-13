import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

export class VexxNodeSpeedupPad extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SPEEDUP_PAD);
  }
}