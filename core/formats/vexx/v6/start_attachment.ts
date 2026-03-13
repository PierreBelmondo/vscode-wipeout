import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

// START_ATTACHMENT — PSVita 2048 only.
// Reverse engineering progress: 100%
// 4×4 transform matrix (data:64); marks an attachment point on a start grid.
// Fully parsed via VexxNodeMatrix.
export class VexxNodeStartAttachment extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.START_ATTACHMENT);
  }
}
