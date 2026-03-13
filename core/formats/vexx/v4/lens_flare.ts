import { BufferRange } from "@core/utils/range";
import { VexxNodeMatrix } from "../node";
import { Vexx4NodeType } from "./type";

// LENS_FLARE — 80 bytes
//
// Sun/sky lens flare light source. Direct child of WORLD.
// Only found in PSP Pure (7 instances across all tracks).
//
// bytes  0-63: matrix     — 4×4 float32, always identity rotation; translation row
//                           gives the light source position in world space.
// bytes 64-67: intensity  — u32 (effectively u8), brightness 0-255.
//                           Low values (5) on indoor/night tracks (Chenghou, Citta Nuova),
//                           high values (84-187) on outdoor/daytime tracks.
// bytes 68-79: padding    — always 0

// Reverse engineering progress: 90%
// Matrix and intensity fully identified. Intensity confirmed as brightness
// correlating with track lighting conditions. Only the exact rendering use
// of the intensity scale (linear vs gamma, multiplier vs direct) is unknown.
export class VexxNodeLensFlare extends VexxNodeMatrix {
  intensity = 0;

  constructor() {
    super(Vexx4NodeType.LENS_FLARE);
  }

  override load(range: BufferRange): void {
    this.matrix = range.getFloat32Array(0, 16);
    this.intensity = range.getUint32(64);
  }
}
