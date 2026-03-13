import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 100%
export class VexxNodeGroup extends VexxNode {
  constructor() {
    super(Vexx4NodeType.GROUP);
  }
}