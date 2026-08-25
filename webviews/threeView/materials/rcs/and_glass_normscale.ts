import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/and_glass_normscale.rcsmaterial
 *
 *   tex[0] Texture1                     wes_ad_cream_win.gtf, and_skyscrape3_shinemap.gtf   -> map
 *   tex[1] Texture2                     wes_window_norm.gtf, and_skyscrape3_n.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine3-lmap.gtf, ile_mesh_combine5-lmap.gtf, ile_mesh_combine9-lmap.gtf   -> lightMap
 *   tex[3] #93f47fef                    (no file)   -> map
 *   tex[4] #584390f2                    (no file)   -> map
 *   tex[5] #c14ac148                    (no file)   -> map
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
export const and_glass_normscale: MaterialFactory = {
  name: "and_glass_normscale.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
