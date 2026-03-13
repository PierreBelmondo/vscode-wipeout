import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// GRID_CAMERA — 48 bytes
//
// Fixed spectator/replay camera placed along the track. Positioned by a parent
// ANIM_TRANSFORM (itself inside a camera GROUP).
//
// Hierarchy: WORLD > GROUP(camera_group) > ANIM_TRANSFORM(grid_camera) > GRID_CAMERA
//
// bytes  0- 3: unknown0       — u32, always 1
// bytes  4- 7: unknown1       — u32, always 32 (0x20)
// bytes  8-11: unknown2       — u32, always 34 (0x22)
// bytes 12-15: frameDuration  — f32, always 1/60 ≈ 0.016667 (same as Camera node)
// bytes 16-19: targetX        — f32, look-at target X (or 0 on some Pure tracks)
// bytes 20-23: targetY        — f32, look-at target Y
// bytes 24-27: targetZ        — f32, look-at target Z
// bytes 28-31: aspectRatio    — f32, always ~1.5 (1.499947 or 1.500000)
// bytes 32-35: unknown3       — f32, large value (~199M), varies slightly per game/track
// bytes 36-47: padding        — always 0

// Reverse engineering progress: 60%
// frameDuration, target position, and aspectRatio identified.
// unknown0/1/2 are constant but purpose unclear (possibly flags/grid dimensions).
// unknown3 purpose unclear (possibly track length hash or render distance).
// Analysed 180 samples across PSP Pure (v4), PSP Pulse (v6), PS2 Pulse (v6), PS3 HD (v6).
export class VexxNodeGridCamera extends VexxNode {
  unknown0 = 1;
  unknown1 = 32;
  unknown2 = 34;
  frameDuration = 1 / 60;
  targetX = 0;
  targetY = 0;
  targetZ = 0;
  aspectRatio = 1.5;
  unknown3 = 0;

  constructor() {
    super(Vexx4NodeType.GRID_CAMERA);
  }

  override load(range: BufferRange): void {
    this.unknown0 = range.getUint32(0);
    this.unknown1 = range.getUint32(4);
    this.unknown2 = range.getUint32(8);
    this.frameDuration = range.getFloat32(12);
    this.targetX = range.getFloat32(16);
    this.targetY = range.getFloat32(20);
    this.targetZ = range.getFloat32(24);
    this.aspectRatio = range.getFloat32(28);
    this.unknown3 = range.getFloat32(32);
  }

  get target(): [number, number, number] {
    return [this.targetX, this.targetY, this.targetZ];
  }
}