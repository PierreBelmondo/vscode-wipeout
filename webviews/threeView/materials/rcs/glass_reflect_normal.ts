import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/glass_reflect_normal.rcsmaterial
 *
 *   tex[0] Texture1  *_shinemap.gtf  diffuse; alpha carries gloss
 *   tex[1] Texture2  *_n.gtf         normal map
 *   tex[2] lightmap
 *
 * Building windows. The alpha of the shinemap is gloss, not cutout, so no
 * alphaTest here — it would punch holes in the low-gloss parts.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const glass_reflect_normal: MaterialFactory = {
  name: "glass_reflect_normal.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { specularMap: map } : {}),
      specular: new THREE.Color(0x888888),
      shininess: 80,
    });
  },
};
