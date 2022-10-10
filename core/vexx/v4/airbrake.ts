import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeAirbrake extends VexxNode {
  constructor() {
    super(Vexx4NodeType.AIRBRAKE);
  }
}
