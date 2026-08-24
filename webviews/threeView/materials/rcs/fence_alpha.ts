import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/fence_alpha.rcsmaterial
 *
 * Pit-lane railing (and_pbrail.gtf). Cutout geometry: the alpha channel carries
 * the fence pattern, so alphaTest rather than blending.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const fence_alpha: MaterialFactory = {
  name: "fence_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      transparent: false,
      alphaTest: 0.5,
    });
  },
};
