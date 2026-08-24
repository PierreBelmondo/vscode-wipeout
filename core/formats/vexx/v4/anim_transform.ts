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

/**
 * Value of `keyframeFormat` meaning both tracks are stored as float32:
 * track1 as xyz world positions, track2 as unit quaternions (w, x, y, z).
 * Anything else (in practice 0) means the compressed int16 encoding.
 */
export const VEXX_KEYFRAME_FLOAT32 = 5;

/** @deprecated use {@link VEXX_KEYFRAME_FLOAT32} — the field covers both tracks. */
export const VEXX_ROTATION_QUATERNION_F32 = VEXX_KEYFRAME_FLOAT32;

/** Written into an x/y/z slot to mean "this axis has no value". */
const POSITION_UNSET = 0x400000;

// Reverse engineering progress: 90%
export class VexxNodeAnimTransform extends VexxNode {
  reserved = 0;         // 0x00
  count1 = 0;           // 0x02  track1 (position) keyframe count
  count2 = 0;           // 0x04  track2 (rotation) keyframe count
  has_position = 0;     // 0x06
  track1_end = 0;       // 0x08  also where track2's keys start
  track1_start = 0;     // 0x0c  always 0x50, i.e. right after this header

  x = 0.0;              // 0x10  \
  y = 0.0;              // 0x14   | track1 decompression origin
  z = 0.0;              // 0x18  /  (0x400000 per axis means "unset")

  track2_values = 0;    // 0x1c  byte offset of track2's values

  sx = 0.0;             // 0x20  \
  sy = 0.0;             // 0x24   | track1 decompression scale, per axis
  sz = 0.0;             // 0x28  /

  track1_values = 0;    // 0x2c  byte offset of track1's values
  _unknown30 = 0;       // 0x30
  keyframeFormat = 0;   // 0x34  see VEXX_KEYFRAME_FLOAT32
  data_end = 0;         // 0x38  byte offset just past the last value
  frameDuration = 0.0;  // 0x3c  always 1/60
  _unknown40 = 0;       // 0x40  usually data_end + 2

  track1?: VexxKeyframeTrack;
  track2?: VexxKeyframeTrack;

  /**
   * The header runs to 0x50 — where track1_start always points. Its last three
   * u32 slots are zero in every node in the sample set, so they read as tail
   * padding rather than fields.
   */
  static readonly HEADER_SIZE = 0x50;

  constructor() {
    super(Vexx4NodeType.ANIM_TRANSFORM);
  }

  override load(range: BufferRange): void {
    const header = range.slice(0, VexxNodeAnimTransform.HEADER_SIZE);

    this.reserved      = header.getUint16(0x00);
    this.count1        = header.getUint16(0x02);
    this.count2        = header.getUint16(0x04);
    this.has_position  = header.getUint16(0x06);
    this.track1_end    = header.getUint32(0x08);
    this.track1_start  = header.getUint32(0x0c);
    this.track2_values = header.getUint32(0x1c);
    this.track1_values = header.getUint32(0x2c);
    this._unknown30    = header.getUint32(0x30);
    this.keyframeFormat = header.getUint32(0x34);
    this.data_end      = header.getUint32(0x38);
    this.frameDuration = header.getFloat32(0x3c);
    this._unknown40    = header.getUint32(0x40);

    if (this.has_position) {
      // 0x400000 marks an axis as unset, so the field keeps its default.
      if (header.getUint32(0x10) != POSITION_UNSET) this.x = header.getFloat32(0x10);
      if (header.getUint32(0x14) != POSITION_UNSET) this.y = header.getFloat32(0x14);
      if (header.getUint32(0x18) != POSITION_UNSET) this.z = header.getFloat32(0x18);
      this.sx = header.getFloat32(0x20) * 32767;
      this.sy = header.getFloat32(0x24) * 32767;
      this.sz = header.getFloat32(0x28) * 32767;
    }

    if (this.count1) {
      this.track1 = new VexxKeyframeTrack();

      const keys = range.slice(this.track1_start);
      for (let i = 0; i < this.count1; i++) {
        this.track1.keys.push(keys.getUint16(2 * i));
      }

      const values = range.slice(this.track1_values);
      if (this.keyframeFormat == VEXX_KEYFRAME_FLOAT32) {
        // Plain float32 xyz in world units — no decompression.
        for (let i = 0; i < this.count1 * 3; i++) {
          this.track1.values.push(values.getFloat32(i * 4));
        }
      } else {
        // int16 offsets from (x, y, z), scaled per axis by (sx, sy, sz).
        for (let i = 0; i < this.count1 * 3; i++) {
          const raw = values.getInt16(i * 2) / 32767.0;
          let value: number;
          if (i % 3 == 0) value = this.x + raw * this.sx;
          else if (i % 3 == 1) value = this.y + raw * this.sy;
          else value = this.z + raw * this.sz;
          this.track1.values.push(value);
        }
      }
    }

    if (this.count2) {
      this.track2 = new VexxKeyframeTrack();

      // track2's keys start at track1_end, not wherever track1's values stop.
      const keys = range.slice(this.track1_end);
      for (let i = 0; i < this.count2; i++) {
        this.track2.keys.push(keys.getUint16(2 * i));
      }

      const values = range.slice(this.track2_values);
      if (this.keyframeFormat == VEXX_KEYFRAME_FLOAT32) {
        // float32 unit quaternions (w, x, y, z).
        for (let i = 0; i < this.count2 * 4; i++) {
          this.track2.values.push(values.getFloat32(i * 4));
        }
      } else {
        // int16 x3, normalised by 32768.
        for (let i = 0; i < this.count2 * 3; i++) {
          this.track2.values.push(values.getInt16(i * 2) / 32768.0);
        }
      }
    }
  }
}
