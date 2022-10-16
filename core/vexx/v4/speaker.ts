import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeSpeaker extends VexxNode {
  constructor() {
    super(Vexx4NodeType.SPEAKER);
  }
}
