import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

export class VexxNodeWingTip extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.WING_TIP);
  }
}