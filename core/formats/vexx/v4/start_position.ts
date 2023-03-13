import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeStartPosition extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.START_POSITION);
  }
}
