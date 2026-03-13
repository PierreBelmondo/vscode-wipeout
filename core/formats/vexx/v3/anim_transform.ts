import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { VexxKeyframeTrack } from "../v4/anim_transform";
import { Vexx3NodeType } from "./type";

// Reverse engineering progress: 80%
// Present in v3 billboard files — a Maya transform node wrapping MESH children.
// Data layout is a variant of v4 ANIM_TRANSFORM with two header formats:
//
// has_position=1 (v4-compatible):
//   0x00: reserved(u16) count1(u16) count2(u16) has_position(u16)
//   0x08: track1_end(u32) track1_start(u32)
//   0x10: position xyz(f32×3) [0x400000 sentinel = no offset]
//   0x1c: padding(u32)
//   0x20: scale xyz(f32×3)
//   0x2c: padding(u32)
//   0x30: track data (keys + values)
//
// has_position=0 (v3-specific, 56-byte header):
//   0x00: reserved(u16) count1(u16) count2(u16) has_position(u16)
//   0x08: trackStart(u32)
//   0x0c: frameDuration(f32) [typically 1/60]
//   0x10: position xyz(f32×3) [0x400000 sentinel = no offset]
//   0x1c: padding(u32)
//   0x20: scale xyz(f32×3)
//   0x2c: padding(u32)
//   0x30: padding(u32×2)
//   0x38: track data (keys + values)

export class Vexx3NodeAnimTransform extends VexxNode {
  reserved = 0;
  count1 = 0;
  count2 = 0;
  has_position = 0;
  frameDuration = 0;

  x = 0.0;
  y = 0.0;
  z = 0.0;
  sx = 0.0;
  sy = 0.0;
  sz = 0.0;

  track1?: VexxKeyframeTrack;
  track2?: VexxKeyframeTrack;

  constructor() {
    super(Vexx3NodeType.ANIM_TRANSFORM);
  }

  override load(range: BufferRange): void {
    this.reserved     = range.getUint16(0);
    this.count1       = range.getUint16(2);
    this.count2       = range.getUint16(4);
    this.has_position = range.getUint16(6);

    let trackStart: number;
    let posOffset: number;

    if (this.has_position) {
      // v4-compatible layout
      trackStart    = range.getUint32(12); // track1_start
      posOffset     = 16;
    } else {
      // v3-specific layout with frameDuration
      trackStart      = range.getUint32(8);
      this.frameDuration = range.getFloat32(12);
      posOffset       = 16;
    }

    // Position block (same layout in both variants)
    const ux = range.getUint32(posOffset);
    const uy = range.getUint32(posOffset + 4);
    const uz = range.getUint32(posOffset + 8);
    if (ux !== 0x400000) this.x = range.getFloat32(posOffset);
    if (uy !== 0x400000) this.y = range.getFloat32(posOffset + 4);
    if (uz !== 0x400000) this.z = range.getFloat32(posOffset + 8);
    this.sx = range.getFloat32(posOffset + 16) * 32767;
    this.sy = range.getFloat32(posOffset + 20) * 32767;
    this.sz = range.getFloat32(posOffset + 24) * 32767;

    // Track 1: position keyframes
    if (this.count1 > 0 && trackStart + this.count1 * 8 <= range.size) {
      let r = range.slice(trackStart);
      this.track1 = new VexxKeyframeTrack();
      for (let i = 0; i < this.count1; i++) {
        this.track1.keys.push(r.getUint16(i * 2));
      }
      r = r.slice(this.count1 * 2);
      for (let i = 0; i < this.count1 * 3; i++) {
        const raw = r.getInt16(i * 2) / 32767.0;
        let value: number;
        if (i % 3 === 0)      value = this.x + raw * this.sx;
        else if (i % 3 === 1) value = this.y + raw * this.sy;
        else                   value = this.z + raw * this.sz;
        this.track1.values.push(value);
      }
      r = r.slice(this.count1 * 6);

      // Track 2: rotation keyframes
      if (this.count2 > 0 && r.size >= this.count2 * 8) {
        this.track2 = new VexxKeyframeTrack();
        for (let i = 0; i < this.count2; i++) {
          this.track2.keys.push(r.getUint16(i * 2));
        }
        r = r.slice(this.count2 * 2);
        for (let i = 0; i < this.count2 * 3; i++) {
          this.track2.values.push(r.getInt16(i * 2) / 32768.0);
        }
      }
    }
  }
}
