import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeShadow extends VexxNode {
  constructor() {
    super(Vexx4NodeType.SHADOW);
  }
}
