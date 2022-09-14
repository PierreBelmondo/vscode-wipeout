import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodePositionShape extends VexxNode {
  constructor() {
    super(Vexx4NodeType.WEATHER_POSITION);
  }
}
