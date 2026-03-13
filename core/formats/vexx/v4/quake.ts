import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// QUAKE — camera-shake zone with per-section intensity data.
// Structure is large (~757 bytes per section) and not yet fully reversed.
// Header: u16 section_count, u16 unknown
// Followed by section_count variable-size entries.
// Reverse engineering progress: 10%
// Only the 4-byte header (sectionCount + unknown u16) is parsed; the large per-section
// body (~757 bytes × sectionCount) is not yet decoded.
export class VexxNodeQuake extends VexxNode {
  sectionCount = 0;
  unknown = 0;

  constructor() {
    super(Vexx4NodeType.QUAKE);
  }

  override load(range: BufferRange): void {
    this.sectionCount = range.getUint16(0);
    this.unknown = range.getUint16(2);
  }
}
