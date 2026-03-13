import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

// Reverse engineering progress: 60%
export class VexxNodeSkycube extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SKYCUBE);
  }
}
