import { BufferRange } from "../../../utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeCamera extends VexxNode {
  properties = {
    unknown1: 0,
    unknown2: 0,
    unknown3: 0,
    frameDuration: 0.01666667, // 1/60 = 60 FPS ?
    unknown5: 0,
    unknown6: 0,
    unknown7: 0,
    unknown8: 0,
    unknown9: 0,
    unknown10: 0,
  };

  constructor() {
    super(Vexx4NodeType.CAMERA);
  }

  override load(range: BufferRange): void {
    //console.log("VexxNodeCamera.load =>", range);
    this.properties.unknown1 = range.getUint32(0);
    this.properties.unknown2 = range.getUint32(4);
    this.properties.unknown3 = range.getUint32(8);
    this.properties.frameDuration = range.getFloat32(12);
    this.properties.unknown5 = range.getFloat32(16);
    this.properties.unknown6 = range.getFloat32(20);
    this.properties.unknown7 = range.getFloat32(24);
    this.properties.unknown8 = range.getFloat32(28);
    this.properties.unknown9 = range.getUint16(32);
    this.properties.unknown10 = range.getUint16(34);
  }
}
