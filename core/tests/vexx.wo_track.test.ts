/**
 * VEXX check – WO_TRACK integrity.
 */

import { Vexx } from "@core/formats/vexx";
import { VexxNodeWoTrack } from "@core/formats/vexx/v4/wo_track";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";
import { Vexx6NodeType } from "@core/formats/vexx/v6/type";

export function checkWoTrack(vexx: Vexx, failures: string[]): void {
  vexx.traverse((node) => {
    if (
      node.header.type !== Vexx4NodeType.WO_TRACK &&
      node.header.type !== Vexx6NodeType.WO_TRACK
    ) return;

    const track = node as VexxNodeWoTrack;

    if (track.lanes.length === 0) {
      failures.push(`${node.path}: no lanes parsed`);
      return;
    }

    const expectedTotal = track.lanes.reduce((s, l) => s + l.pointCount, 0);
    if (track.points.length !== expectedTotal) {
      failures.push(
        `${node.path}: expected ${expectedTotal} points from lane headers, got ${track.points.length}`
      );
      return;
    }

    // Validate that direction vectors are unit-length (catches stride/offset bugs)
    const BAD_MAG_THRESHOLD = 0.02;
    for (let i = 0; i < track.points.length; i++) {
      const pt = track.points[i];
      for (const [vec, name] of [
        [pt.right, "right"],
        [pt.down, "down"],
        [pt.forward, "forward"],
      ] as const) {
        const mag = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
        if (Math.abs(mag - 1) > BAD_MAG_THRESHOLD) {
          failures.push(
            `${node.path}: point[${i}].${name} magnitude ${mag.toFixed(4)} (expected ~1)`
          );
          return; // one failure per track is enough
        }
      }
    }
  });
}
