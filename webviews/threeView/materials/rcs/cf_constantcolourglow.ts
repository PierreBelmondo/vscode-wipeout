import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/cf_constantcolourglow.rcsmaterial
 *
 * Untextured constant-colour glow; the colour is in Constant1 (1.0, 1.0, 0.0 here), so no texture reaches make().
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const cf_constantcolourglow: MaterialFactory = {
  name: "cf_constantcolourglow.rcsmaterial",
  minTextures: 0,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: 0xffff00,
    });
  },
};
