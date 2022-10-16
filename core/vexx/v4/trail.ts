import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeTrail extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.TRAIL);
  }
}
