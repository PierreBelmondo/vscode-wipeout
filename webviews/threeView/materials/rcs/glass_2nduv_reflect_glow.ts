import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/glass_2nduv_reflect_glow.rcsmaterial
 *
 *   tex[0] #290a5adb                    j_shipwinalpha.gtf, big_build_strip_win3a.gtf, j_windows5_alpha.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine10-lmap.gtf, ile_mesh_combine13-lmap.gtf, ile_mesh_combine14-lmap.gtf   -> lightMap
 *   tex[2] #c29b64e4                    j_shipwin.gtf, big_build_win3a.gtf, j_windows5.gtf   -> map
 *   tex[3] #fc21467a                    (no file)   -> map
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
export const glass_2nduv_reflect_glow: MaterialFactory = {
  name: "glass_2nduv_reflect_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
