import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

export class VexxNodeSkycube extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SKYCUBE);
  }
}
