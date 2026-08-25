import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/mt_windows_a.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_window_a_diffuse.gtf   -> map
 *   tex[1] #fc52b822                    dc_window_a_normalmap.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine6-lmap.gtf, ile_mesh_combine7-lmap.gtf   -> lightMap
 *   tex[3] #5e5b1937                    (no file)   -> map
 *   tex[4] #370a63cb                    (no file)   -> map
 *   tex[5] #81e0e773                    (no file)   -> map
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
export const mt_windows_a: MaterialFactory = {
  name: "mt_windows_a.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
