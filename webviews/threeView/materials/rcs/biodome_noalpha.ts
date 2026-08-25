import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/biodome_noalpha.rcsmaterial
 *
 *   tex[0] #4b23c2e7                    biodome_glass_colour_spec.gtf   -> map
 *   tex[1] #c7b782c3                    iridescentdome.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] #464ac094                    (no file)   -> map
 *   tex[5] #c47baf36                    (no file)   -> map
 *   tex[6] #81e0e773                    (no file)   -> map
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
export const biodome_noalpha: MaterialFactory = {
  name: "biodome_noalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
