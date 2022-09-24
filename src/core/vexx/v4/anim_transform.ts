import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeAnimTransform extends VexxNode {
  unk1 = 0;
  unk2 = 0;
  unk3 = 0;
  unk4 = 0;
  unk5 = 0;
  unk6 = 0;
  unk7 = 0;
  unk8 = 0;

  x = 0.0;
  y = 0.0;
  z = 0.0;
  
  keys = [] as number[];
  points = [] as { x: number; y: number; z: number }[];

  constructor() {
    super(Vexx4NodeType.ANIM_TRANSFORM);
  }

  override load(range: BufferRange): void {
    this.unk1 = range.getUint16(0);
    this.unk2 = range.getUint16(2);
    this.unk3 = range.getUint16(4);
    this.unk4 = range.getUint16(6);
    this.unk5 = range.getUint16(8);
    this.unk6 = range.getUint16(10);
    this.unk7 = range.getUint16(12);
    this.unk8 = range.getUint16(14);

    const rangeHdr = range.slice(16, this.unk5);
    this.x = rangeHdr.getFloat32(0);
    this.y = rangeHdr.getFloat32(4);
    this.z = rangeHdr.getFloat32(8);

    const rangeKey = range.slice(this.unk5, this.unk5 + 2 * this.unk3);
    const rangeDat = range.slice(this.unk5 + 2 * this.unk3);

    for (let i = 0; i < this.unk3; i++) {
      const k = rangeKey.getUint16(2 * i);
      this.keys.push(k);
    }

    const left = rangeDat.buffer.byteLength;
    for (let i = 0; i < this.unk3; i++) {
      const x = rangeDat.getInt16(i * 6 + 0 * 2);
      const y = rangeDat.getInt16(i * 6 + 1 * 2);
      const z = rangeDat.getInt16(i * 6 + 2 * 2);
      this.points.push({ x, y, z });
    }
  }
}
