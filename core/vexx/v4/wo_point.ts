import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeWoPoint extends VexxNode {
  constructor() {
    super(Vexx4NodeType.WO_POINT);
  }
}
