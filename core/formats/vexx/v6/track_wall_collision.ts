import { VexxNodeCollision } from "../v4/collision";
import { Vexx6NodeType } from "./type";

// Reverse engineering progress: 70%
// Inherits VexxNodeCollision; see collision.ts for detailed progress breakdown.
export class VexxNodeTrackWallCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx6NodeType.TRACK_WALL_COLLISION);
  }
}