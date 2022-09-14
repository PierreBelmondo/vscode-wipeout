import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeGroup extends VexxNode {
  constructor() {
    super(Vexx4NodeType.GROUP);
  }
}