import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/billboards/constantcolour.rcsmaterial
 *
 * Flat untextured colour. The only bound slot is the empty lightmap, so
 * make() receives no textures; the colour itself comes from a constant the
 * engine patches at bind time.
 *
 * Permutation: Static[0], RigidBody[1] of 2 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const constantcolour: MaterialFactory = {
  name: "constantcolour.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: () => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      vertexColors: true,
    });
  },
};
