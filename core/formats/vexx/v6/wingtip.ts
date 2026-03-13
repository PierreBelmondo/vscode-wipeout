import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 100%
// 4×4 transform matrix only (data:64); fully parsed via VexxNodeMatrix.
export class VexxNodeWingTip extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.WING_TIP);
  }
}