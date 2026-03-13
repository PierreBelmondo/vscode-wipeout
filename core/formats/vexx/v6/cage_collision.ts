import { VexxNodeCollision } from "../v4/collision";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 70%
export class VexxNodeCageCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx6NodeType.CAGE_COLLISION);
  }
}