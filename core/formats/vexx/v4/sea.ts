import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

export class VexxNodeSea extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SEA);
  }
}
