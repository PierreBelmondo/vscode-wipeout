import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 0%
// Not present in any available sample data (confirmed across PSP Pure v4,
// PSP Pulse v6, PS2 Pulse v6, PS3 HD v6 — 0 instances found).
// Type IDs: v4=0x37e, v6=0x3cc. Likely a positional audio emitter
// (counterpart to SOUND), but body layout is unknown without samples.
export class VexxNodeSpeaker extends VexxNode {
  constructor() {
    super(Vexx4NodeType.SPEAKER);
  }
}
