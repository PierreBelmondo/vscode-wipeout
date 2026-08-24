import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/biodome_reflect.rcsmaterial
 *
 *   tex[0] #eedee991                    biodome_glass_alpha.gtf   -> map
 *   tex[1] #4b23c2e7                    biodome_glass_colour_spec.gtf   -> specularMap
 *   tex[2] #c7b782c3                    iridescentdome.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #788c062d                    (no file)   -> map
 *   tex[7] #c47baf36                    (no file)   -> map
 *   tex[8] #81e0e773                    (no file)   -> map
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
export const biodome_reflect: MaterialFactory = {
  name: "biodome_reflect.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, map1, lightMap, map2, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
