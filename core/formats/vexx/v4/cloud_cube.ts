import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// CLOUD_CUBE — 16 bytes
//
// Defines a volumetric cloud region. Positioned by a parent TRANSFORM node,
// grouped under a CLOUD_GROUP.
//
// bytes  0-3 : cloudType  — int32, cloud appearance variant (0, 1, or 2)
// bytes  4-7 : opacity    — float32, always 1.0 in known files
// bytes 8-15 : padding    — always 0

// Reverse engineering progress: 90%
// cloudType and opacity fully identified. Bytes 8-15 confirmed zero across
// all known PSP Pure, PSP Pulse, PS2 Pulse, and PS3 HD files (88 samples).
export class VexxNodeCloudCube extends VexxNode {
  cloudType = 0;
  opacity = 1.0;

  constructor() {
    super(Vexx4NodeType.CLOUD_CUBE);
  }

  override load(range: BufferRange): void {
    this.cloudType = range.getInt32(0);
    this.opacity = range.getFloat32(4);
  }
}
