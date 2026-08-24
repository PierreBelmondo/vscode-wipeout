import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/and_rocktosand.rcsmaterial
 *
 * Rock-to-sand terrain blend:
 *   tex[0] ?  j_rockblend5.gtf   blend weights
 *   tex[1]    lightmap
 *   tex[2] ?  and_rock4.gtf      layer A (rock)
 *   tex[3] ?  and_sand_sand.gtf  layer B (sand)
 *
 * Note the slot order differs from 2rocksandblend_via_diffuse: the lightmap sits
 * at tex[1], between the mask and the layers. RCSMODELLoader drops empty
 * lightmaps, so the array make() receives is not a fixed shape — pick the layer
 * by name-independent position only after checking the count.
 *
 * Shows the rock layer until the blend is implemented; drawing the weight mask
 * as diffuse is what made this read as black/red.
 *
 * Permutation: Static[0] of 21 — the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: real blend between and_rock4 and and_sand_sand via the mask.
 */
export const and_rocktosand: MaterialFactory = {
  name: "and_rocktosand.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    // Slot 1 is the lightmap (often empty), so the layers keep their real
    // indices: 0 = blend mask, 2 = rock, 3 = sand.
    const rock = textures[2];
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(rock ? { map: rock } : {}),
    });
  },
};
