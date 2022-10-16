import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeLodGroup extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.LOD_GROUP);
  }
}
