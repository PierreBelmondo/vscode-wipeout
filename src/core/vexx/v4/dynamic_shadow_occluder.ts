import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeDynamicShadowOccluder extends VexxNode {
  constructor() {
    super(Vexx4NodeType.SHADOW);
  }
}
