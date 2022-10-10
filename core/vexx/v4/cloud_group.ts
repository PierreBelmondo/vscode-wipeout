import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeCloudGroup extends VexxNode {
  constructor() {
    super(Vexx4NodeType.CLOUD_GROUP);
  }
}
