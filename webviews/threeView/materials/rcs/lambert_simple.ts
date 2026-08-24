import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/lambert_simple.rcsmaterial
 *
 * Plain diffuse environment surface (concrete, pillars, distant hills,
 * billboards). tex[0] is diffuseTexture, tex[1] the lightmap — which on this
 * track is often a real `lmaps/*-lmap.gtf` rather than the empty placeholder.
 *
 * Permutation: Static[0] of 42 — the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 */
export const lambert_simple: MaterialFactory = {
  name: "lambert_simple.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
    });
  },
};
