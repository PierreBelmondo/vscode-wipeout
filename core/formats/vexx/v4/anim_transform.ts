import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxKeyframeTrack {
  keys: number[];
  values: number[];

  constructor(keys: number[] = [], values: number[] = []) {
    this.keys = keys;
    this.values = values;
  }
}

export class VexxNodeAnimTransform extends VexxNode {
  unk1 = 0;
  count1 = 0;
  count2 = 0;
  has_position = 0;
  track1_end = 0;
  track1_start = 0;

  x = 0.0;
  y = 0.0;
  z = 0.0;
  sx = 0.0;  // per-axis decompression scale for track1 (max animated range)
  sy = 0.0;
  sz = 0.0;

  track1?: VexxKeyframeTrack;
  track2?: VexxKeyframeTrack;

  constructor() {
    super(Vexx4NodeType.ANIM_TRANSFORM);
  }

  override load(range: BufferRange): void {
    const rangeHeader = range.slice(0, 16);
    this.unk1         = rangeHeader.getUint16(0);
    this.count1       = rangeHeader.getUint16(2);
    this.count2       = rangeHeader.getUint16(4);
    this.has_position = rangeHeader.getUint16(6);
    this.track1_end   = rangeHeader.getUint32(8);
    this.track1_start = rangeHeader.getUint32(12);

    let rangeData = range.slice(rangeHeader.size);
    if (this.has_position) {
      const ux = rangeData.getUint32(0);
      const uy = rangeData.getUint32(4);
      const uz = rangeData.getUint32(8);
      if (ux != 0x400000) this.x = rangeData.getFloat32(0);
      if (uy != 0x400000) this.y = rangeData.getFloat32(4);
      if (uz != 0x400000) this.z = rangeData.getFloat32(8);
      this.sx = rangeData.getFloat32(16) * 32767;
      this.sy = rangeData.getFloat32(20) * 32767;
      this.sz = rangeData.getFloat32(24) * 32767;
      rangeData = rangeData.slice(32);
    }

    rangeData = range.slice(this.track1_start);
    if (this.count1) {
      this.track1 = new VexxKeyframeTrack();
      for (let i = 0; i < this.count1; i++) {
        const k = rangeData.getUint16(2 * i);
        this.track1.keys.push(k);
      }
      rangeData = rangeData.slice(2 * this.count1);

      for (let i = 0; i < this.count1 * 3; i++) {
        const raw = rangeData.getInt16(i * 2) / 32767.0;
        let value: number;
        if (i % 3 == 0) value = this.x + raw * this.sx;
        else if (i % 3 == 1) value = this.y + raw * this.sy;
        else value = this.z + raw * this.sz;
        this.track1.values.push(value);
      }
      rangeData = rangeData.slice(6 * this.count1);
    }

    if (this.count2) {
      this.track2 = new VexxKeyframeTrack();
      for (let i = 0; i < this.count2; i++) {
        const k = rangeData.getUint16(2 * i);
        this.track2.keys.push(k);
      }
      rangeData = rangeData.slice(2 * this.count2);

      for (let i = 0; i < this.count2 * 3; i++) {
        const value = rangeData.getInt16(i * 2) / 32768.0;
        this.track2.values.push(value);
      }
      rangeData = rangeData.slice(6 * this.count2);
    }
  }
}
