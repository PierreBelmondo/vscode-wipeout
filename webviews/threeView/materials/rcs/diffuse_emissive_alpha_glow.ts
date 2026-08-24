import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/diffuse_emissive_alpha_glow.rcsmaterial
 *
 * Diffuse with an emissive glow tinted by a Constant slot (here 1.0, 0.968, 0.730). tex[0] diffuse, tex[1] lightmap.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const diffuse_emissive_alpha_glow: MaterialFactory = {
  name: "diffuse_emissive_alpha_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { emissiveMap: map } : {}),
      emissive: new THREE.Color(0xfff7ba),
    });
  },
};
