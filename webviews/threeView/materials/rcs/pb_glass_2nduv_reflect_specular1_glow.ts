import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/pb_glass_2nduv_reflect_specular1_glow.rcsmaterial
 *
 *   tex[0] #290a5adb                    wes_windows_d_strip.gtf   -> map
 *   tex[1] #e69a79f6                    pb_wes_windows_d_s.gtf   -> specularMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #c29b64e4                    wes_windows_d.gtf   -> map
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
export const pb_glass_2nduv_reflect_specular1_glow: MaterialFactory = {
  name: "pb_glass_2nduv_reflect_specular1_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
