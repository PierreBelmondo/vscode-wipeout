import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 100%
// 4×4 transform matrix only (data:64); fully parsed via VexxNodeMatrix.
export class VexxNodeShipColisionFx extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.SHIP_COLLISION_FX);
  }
}
