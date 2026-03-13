import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";

// Reverse engineering progress: 100%
// All fields confirmed: sectionId, woTrackData, pvsMaskLow/High, aabb, name.
export class VexxNodeSection extends VexxNode {
  properties = {
    sectionId: 0,   // section ID (= 0x100 + relative index within this file)
    woTrackData: 0, // WO_TRACK reference (meaning confirmed by user)
    pvsMaskLow: 0,  // PVS bitmask low  — bit N set = this section is visible when active section is N (N = 0..31)
    pvsMaskHigh: 0, // PVS bitmask high — bit N set = visible when active section is N+32 (N = 0..31)
    aabb: new AABB(),
    name: "A_",
  };

  constructor() {
    super(Vexx4NodeType.SECTION);
  }

  override load(range: BufferRange): void {
    this.properties.sectionId   = range.getUint16(0);
    this.properties.woTrackData = range.getUint32(4);
    this.properties.pvsMaskLow  = range.getUint32(8);
    this.properties.pvsMaskHigh = range.getUint32(12);
    this.properties.aabb        = AABB.loadFromFloat32(range.slice(16, 48));
    this.properties.name        = range.slice(48).getString();
  }

  /** 0-based index of this section within the file (= sectionId - 0x100). */
  get sectionIndex(): number {
    return this.properties.sectionId - 0x100;
  }

  /** Returns true if this section should be rendered when the camera is in section `activeSectionIndex`. */
  isVisibleFrom(activeSectionIndex: number): boolean {
    if (activeSectionIndex < 32) {
      return (this.properties.pvsMaskLow >>> activeSectionIndex & 1) === 1;
    } else {
      return (this.properties.pvsMaskHigh >>> (activeSectionIndex - 32) & 1) === 1;
    }
  }
}
