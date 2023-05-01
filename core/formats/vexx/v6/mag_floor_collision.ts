import { VexxNodeCollision } from "../v4/collision";
import { Vexx6NodeType } from "./type";

export class VexxNodeMagFloorCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx6NodeType.MAG_FLOOR_COLLISION);
  }
}