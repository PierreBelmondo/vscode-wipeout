import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/glass_2nduv_glow.rcsmaterial
 *
 *   tex[0] Texture1                     jd_sebenco_interior_01.gtf   -> map
 *   tex[1] #a52e962d                    jd_sebenco_interior_01_alphaglow.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #2d922158                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const glass_2nduv_glow: MaterialFactory = {
  name: "glass_2nduv_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
