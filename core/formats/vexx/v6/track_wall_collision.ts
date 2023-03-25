import { VexxNodeCollision } from "../v4/collision";
import { Vexx6NodeType } from "./type";

export class VexxNodeTrackWallCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx6NodeType.TRACK_WALL_COLLISION);
  }
}