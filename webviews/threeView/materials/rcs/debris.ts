import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/debris.rcsmaterial
 *
 * Ship damage debris. Real slots: tex[0] Diffuse_Texture
 * (ship_damage/textures/damaged_parts.gtf). The lightmap is empty and the
 * three remaining slots are rgba constants (ShadowAlpha, ShadowColour, ?).
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const debris: MaterialFactory = {
  name: "debris.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
      alphaTest: 0.5,
    });
  },
};
