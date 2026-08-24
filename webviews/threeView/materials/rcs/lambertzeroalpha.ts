import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/materials/lambertzeroalpha.rcsmaterial
 *
 * Environment lambert. Only tex[0] (diffuseTexture) is a real file; the
 * lightmap slot is empty and uvOffset is an rgba constant, so make() gets
 * a single texture. "zeroalpha" = the alpha channel is not used for
 * blending, so render it opaque.
 *
 * Permutation: Static[0] of 100 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const lambertzeroalpha: MaterialFactory = {
  name: "lambertzeroalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    // 190 of the 805 material slots in 01_vineta_k/track. The lightmap slot is
    // empty on ship models but a real lmaps/*-lmap.gtf on track geometry, so it
    // has to be accepted here or those meshes fall through to the fallback.
    const [map, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      transparent: false,
    });
  },
};
