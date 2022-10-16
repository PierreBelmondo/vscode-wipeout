import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeTransform extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.TRANSFORM);
  }
}
