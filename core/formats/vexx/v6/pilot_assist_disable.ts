import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx6NodeType } from "./type";

// PILOT_ASSIST_DISABLE — PSVita 2048 only.
// Reverse engineering progress: 100%
// Shape child of a TRANSFORM; defines a sphere within which pilot-assist (autopilot/
// steering aid) is disabled. The transform parent provides the world-space centre.
// data:16 — radius(f32) + 12 bytes padding (always 0x00).
export class VexxNodePilotAssistDisable extends VexxNode {
  radius = 0.0;

  constructor() {
    super(Vexx6NodeType.PILOT_ASSIST_DISABLE);
  }

  override load(range: BufferRange): void {
    this.radius = range.getFloat32(0);
  }
}
