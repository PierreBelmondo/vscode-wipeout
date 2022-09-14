import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeDirectionalLight extends VexxNode {
  constructor() {
    super(Vexx4NodeType.DIRECTIONAL_LIGHT);
  }
}
