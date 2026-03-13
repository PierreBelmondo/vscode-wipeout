/**
 * VEXX check – mesh vertex AABB containment.
 */

import { Vexx } from "@core/formats/vexx";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";

const EPSILON = 1e-3;

function inRange(value: number, min: number, max: number): boolean {
  return value >= min - EPSILON && value <= max + EPSILON;
}

export function checkMeshAabb(vexx: Vexx, failures: string[], meshType: number): void {
  vexx.traverse((node) => {
    if (node.header.type !== meshType) return;
    const mesh = node as VexxNodeMesh;
    if (mesh.isExternal) return;

    for (const chunk of mesh.chunks) {
      if (chunk.parseError) continue;
      const { aabb } = chunk;

      for (const [view, label] of [[chunk.strides, 's1'], [chunk.strides2, 's2']] as const) {
        const raw = view.toRawVertexData();
        for (let i = 0; i < raw.valid.length; i++) {
          if (!raw.valid[i]) continue;
          const p = i * 3;
          const vx = raw.positions[p], vy = raw.positions[p + 1], vz = raw.positions[p + 2];
          if (
            !inRange(vx, aabb.min[0], aabb.max[0]) ||
            !inRange(vy, aabb.min[1], aabb.max[1]) ||
            !inRange(vz, aabb.min[2], aabb.max[2])
          ) {
            failures.push(
              `  ${node.path} | chunk ${label}[${i}]` +
              ` vertex=(${vx.toFixed(3)}, ${vy.toFixed(3)}, ${vz.toFixed(3)})` +
              ` outside AABB min=(${aabb.min[0].toFixed(3)}, ${aabb.min[1].toFixed(3)}, ${aabb.min[2].toFixed(3)})` +
              ` max=(${aabb.max[0].toFixed(3)}, ${aabb.max[1].toFixed(3)}, ${aabb.max[2].toFixed(3)})`
            );
            return;
          }
        }
      }
    }
  });
}
