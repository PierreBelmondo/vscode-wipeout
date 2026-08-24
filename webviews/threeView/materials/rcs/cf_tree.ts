import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/cf_tree.rcsmaterial
 *
 * 2D tree billboards (palm_2d.gtf, and_treemelbourneshow1_atoc.gtf). The `_atoc`
 * suffix is alpha-to-coverage: the cutout lives in the texture's alpha channel,
 * so this needs alphaTest, not alpha blending — blending would sort badly
 * against the rest of the scenery and make the foliage look solid.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const cf_tree: MaterialFactory = {
  name: "cf_tree.rcsmaterial",
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
