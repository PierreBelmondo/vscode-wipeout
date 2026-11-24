import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 50%
// frameDuration (1/60 s), the aim point and the FOV are confirmed.
//
// targetX/Y/Z is a world-space aim point on the camera's view ray (-Z of the
// parent TRANSFORM): on PSP Pure tracks, 99 of 102 cameras check out with
// dot >= 0.9999999 (the other 3 lack a usable parent transform). fov is
// 1.4999 rad on all 102 Pure track cameras. Other games carry other values
// here (~2.0, 0.5).
//
// The engine's Camera importer takes its one tunable, "LoopEnd", from the node
// header's named property list rather than from these body bytes; the same
// mechanism drives GRID_CAMERA (see grid_camera.ts) and ANIM_TRANSFORM.
//
// The body is 48 bytes, not the 36 read below -- bytes 36..47 are always zero
// (2,410 of 2,411 CAMERA nodes across the PSP/PS2/PS3 corpus; one 80-byte
// outlier carries small packed u16 pairs there, not a second float triple).
// unknown1/2/3 and frameDuration are constant across the whole corpus except
// unknown3, which is {34, 50}; unknown5/6/7 are the only fields with real
// per-node variation (271-583 distinct values) -- the aim point, the same slot
// as GRID_CAMERA's targetX/Y/Z. Only one target triple exists in the body:
// not a near/far pair.
export class VexxNodeCamera extends VexxNode {
  properties = {
    unknown1: 0,
    unknown2: 0,
    unknown3: 0,
    frameDuration: 0.01666667, // 1/60 = 60 FPS ?
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 0, // radians
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
    this.properties.targetX = range.getFloat32(16);
    this.properties.targetY = range.getFloat32(20);
    this.properties.targetZ = range.getFloat32(24);
    this.properties.fov = range.getFloat32(28);
    this.properties.unknown9 = range.getUint16(32);
    this.properties.unknown10 = range.getUint16(34);
  }
}
