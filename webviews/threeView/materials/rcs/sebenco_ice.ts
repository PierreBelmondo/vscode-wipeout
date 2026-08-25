import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/sebenco_ice.rcsmaterial
 *
 *   tex[0] #8365b1f3                    and_ice2.gtf   -> map
 *   tex[1] ice                          and_ice1.gtf   -> map
 *   tex[2] icenormal                    256norm4.gtf   -> normalMap
 *   tex[3] lightmap                     ile_mesh_combine-lmap.gtf, ile_mesh_combine10-lmap.gtf   -> lightMap
 *   tex[4] snow1                        and_snow3alpha.gtf   -> map
 *   tex[5] #f1d875a1                    and_rock_snow_blend_caveentrance.gtf, and_snow_ice_transition_pond.gtf   -> map
 *   tex[6] snownorm1                    and_snow_norm.gtf   -> unused
 *   tex[7] #1017e83c                    (no file)   -> map
 *   tex[8] #e7a83aef                    (no file)   -> map
 *   tex[9] #ef8869cd                    (no file)   -> map
 *   tex[10] #1f3b345d                    (no file)   -> map
 *   tex[11] #591c1bc2                    (no file)   -> map
 *   tex[12] #a1b54b80                    (no file)   -> map
 *   tex[13] #e8ad3519                    (no file)   -> map
 *   tex[14] #4042b6e6                    (no file)   -> map
 *   tex[15] #3ff1e8c1                    (no file)   -> map
 *   tex[16] #46ce6dda                    (no file)   -> map
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
export const sebenco_ice: MaterialFactory = {
  name: "sebenco_ice.rcsmaterial",
  minTextures: 1,
  maxTextures: 17,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, normalMap, lightMap, map2, map3, _unused6, map4, map5, map6, map7, map8, map9, map10, map11, map12, map13] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      ...(map8 ? { map: map8 } : {}),
      ...(map9 ? { map: map9 } : {}),
      ...(map10 ? { map: map10 } : {}),
      ...(map11 ? { map: map11 } : {}),
      ...(map12 ? { map: map12 } : {}),
      ...(map13 ? { map: map13 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
