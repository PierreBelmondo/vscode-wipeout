import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";
import { Flat } from "../flat";

export class VexxNodeSkycube extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SKYCUBE);
  }

  override export() : Flat.Node {
    const node = super.export();
    node.type = "SKYCUBE";
    return node;
  }
}
