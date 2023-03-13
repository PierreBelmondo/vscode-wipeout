import { VexxNode } from "../node";
import { Vexx6NodeType } from "./type";

export class VexxNodeCageCollision extends VexxNode {
  constructor() {
    super(Vexx6NodeType.CAGE_COLLISION);
  }
}