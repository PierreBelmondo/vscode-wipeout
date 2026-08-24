import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/jd_alphalambert.rcsmaterial
 *
 * Alpha-cutout diffuse foliage (and_palm_atoc.gtf). Same shape as
 * jd_alphalambert_alphatest; both are `_atoc` textures, so alphaTest.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const jd_alphalambert: MaterialFactory = {
  name: "jd_alphalambert.rcsmaterial",
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
