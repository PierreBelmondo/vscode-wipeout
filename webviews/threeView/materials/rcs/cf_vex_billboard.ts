import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/cf_vex_billboard.rcsmaterial
 *
 *   tex[0] Texture1  landscape/advert art
 *   tex[1] Texture2  tv_glow.gtf — additive glow layer
 *   tex[2] lightmap
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const cf_vex_billboard: MaterialFactory = {
  name: "cf_vex_billboard.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, glow, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(glow ? { emissiveMap: glow } : {}),
      emissive: new THREE.Color(0xffffff),
    });
  },
};
