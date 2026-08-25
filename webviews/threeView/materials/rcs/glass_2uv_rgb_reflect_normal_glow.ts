import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/glass_2uv_rgb_reflect_normal_glow.rcsmaterial
 *
 *   tex[0] Texture1                     jay_monotrain_windows.gtf, j_window9_n.gtf   -> map
 *   tex[1] #290a5adb                    j_windows3_alpha.gtf, j_window9_alpha.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine14-lmap.gtf   -> lightMap
 *   tex[3] #c29b64e4                    jay_monotrain_windows.gtf, j_window9.gtf   -> map
 *   tex[4] #fc21467a                    (no file)   -> map
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
export const glass_2uv_rgb_reflect_normal_glow: MaterialFactory = {
  name: "glass_2uv_rgb_reflect_normal_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
