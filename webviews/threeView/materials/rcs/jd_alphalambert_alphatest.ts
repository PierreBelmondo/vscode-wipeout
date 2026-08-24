import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/jd_alphalambert_alphatest.rcsmaterial
 *
 * Palm fronds (and_palm.gtf). Alpha-tested cutout.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const jd_alphalambert_alphatest: MaterialFactory = {
  name: "jd_alphalambert_alphatest.rcsmaterial",
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
