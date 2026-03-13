import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 100%
// 4×4 transform matrix only; fully parsed via VexxNodeMatrix.
export class VexxNodeCloudGroup extends VexxNodeMatrix {
  constructor() {
    super(Vexx4NodeType.CLOUD_GROUP);
  }
}
