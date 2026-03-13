import { VexxNodeMatrix } from "../node";
import { Vexx6NodeType } from "./type";

// FOG_REGION — PSVita 2048 only.
// Reverse engineering progress: 100%
// Shape child of a TRANSFORM; defines an oriented bounding box (OBB) fog volume.
// data:80 — 4×4 f32 matrix (64 bytes) encoding the OBB transform where each row
// is a scaled axis (rows 0–2 = half-extent basis vectors, row 3 = centre xyz + w=1),
// followed by 16 bytes of padding (always 0x00).
// The matrix is parsed via VexxNodeMatrix; the trailing 16 bytes are ignored.
export class VexxNodeFogRegion extends VexxNodeMatrix {
  constructor() {
    super(Vexx6NodeType.FOG_REGION);
  }
}
