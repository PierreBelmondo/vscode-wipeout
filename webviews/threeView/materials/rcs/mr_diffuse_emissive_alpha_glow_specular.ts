import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/mr_diffuse_emissive_alpha_glow_specular.rcsmaterial
 *
 *   tex[0] #6f9e6faf                    mar_orangepowerbeam_glow.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #eca14ca6                    (no file)   -> map
 *   tex[3] #2a2dc10b                    (no file)   -> map
 *   tex[4] #8f3d0540                    (no file)   -> map
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
export const mr_diffuse_emissive_alpha_glow_specular: MaterialFactory = {
  name: "mr_diffuse_emissive_alpha_glow_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
