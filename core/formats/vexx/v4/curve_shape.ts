import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// CURVE_SHAPE — always dataLength=0, always leaf (no children).
//
// A pure structural marker exported from Maya's NurbsCurve node.
// All semantic information lives in the scene-graph position and node name;
// there is no body data to parse.
//
// Three distinct roles:
//
//   1. Control-point of a spatial curve
//        [TRANSFORM "guidecurve1"] pos=(0,-10,0)
//          └─ [CURVE_SHAPE "guidecurveShape1"]       ← CV at (0,-10,0)
//        [CURVE_SHAPE "guidecurveShape2"]            ← CV at world origin
//      Each TRANSFORM sibling provides one control vertex; the shared name
//      prefix (e.g. "guidecurveShape") groups them into one polyline/NURBS
//      path.  Used for AI guide-lines, camera splines, etc.
//
//   2. Shape of a motion trail
//        [TRAIL "motrail"]
//          └─ [CURVE_SHAPE "motrailShape"]
//      The TRAIL node holds the world matrix; the child CURVE_SHAPE just
//      identifies the curve geometry that the trail follows.
//
//   3. Animation-curve channel reference (world-level, no transform parent)
//        [CURVE_SHAPE "curveShape1"]   ← channel 1
//        [CURVE_SHAPE "curveShape2"]   ← channel 2
//        ...
//      Sequential world-level curve shapes correspond 1-to-1 to the animated
//      properties of an ANIM_TRANSFORM node elsewhere in the same file.
//      The channel index is implicit from declaration order.
//
// Observed across PSP Pure (v4), PSP Pulse, and PS2 — zero exceptions.
// Reverse engineering progress: 100%
// Always dataLength=0; pure structural marker (see file-level comment for roles).
export class VexxNodeCurveShape extends VexxNode {
  constructor() {
    super(Vexx4NodeType.CURVE_SHAPE);
  }
}
