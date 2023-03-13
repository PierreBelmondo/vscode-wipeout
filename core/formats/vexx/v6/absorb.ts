import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

export class VexxNodeAbsorb extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.ABSORB);
  }
}