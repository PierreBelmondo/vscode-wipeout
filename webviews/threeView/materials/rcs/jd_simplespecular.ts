import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/jd_simplespecular.rcsmaterial
 *
 * The single most used material in 01_vineta_k: 192 of the track's 805 slots.
 * Diffuse texture plus a specular highlight; the lightmap slot is usually empty
 * but is a real file on some meshes, so accept one or two textures.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const jd_simplespecular: MaterialFactory = {
  name: "jd_simplespecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x333333),
      shininess: 40,
    });
  },
};
