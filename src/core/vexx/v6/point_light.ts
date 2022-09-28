import { VexxNode } from "../node";
import { Vexx6NodeType } from "./type";

export class VexxNodePointLight extends VexxNode {
  constructor() {
    super(Vexx6NodeType.POINT_LIGHT);
  }
}