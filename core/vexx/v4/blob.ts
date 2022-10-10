import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeBlob extends VexxNode {
  constructor() {
    super(Vexx4NodeType.BLOB);
  }
}
