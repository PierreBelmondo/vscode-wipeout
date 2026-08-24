import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/and_spec_colourcontrol.rcsmaterial
 *
 * Specular surface whose highlight colour comes from Constant2 (0.156, 0.268, 0.547 here). tex[0] Texture1, tex[1] lightmap.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const and_spec_colourcontrol: MaterialFactory = {
  name: "and_spec_colourcontrol.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x28448c),
      shininess: 50,
    });
  },
};
