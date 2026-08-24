import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/sebenco_snow.rcsmaterial
 *
 *   tex[0] lightmap                     ile_mesh_combine-lmap.gtf, ile_mesh_combine31-lmap.gtf, ile_mesh_combine9-lmap.gtf   -> lightMap
 *   tex[1] rock                         and_mountain2.gtf, and_rock4.gtf   -> map
 *   tex[2] #85ba9c63                    and_snow_norm.gtf, and_rock_normal.gtf   -> normalMap
 *   tex[3] snow                         and_snow3alpha.gtf   -> map
 *   tex[4] snownorm                     and_snow_norm.gtf   -> unused
 *   tex[5] #40db67c1                    and_mountain2_nearblend.gtf, and_rock_snow_blend_close.gtf   -> map
 *   tex[6] #bd4582d3                    (no file)   -> map
 *   tex[7] #1017e83c                    (no file)   -> map
 *   tex[8] #74a4fe88                    (no file)   -> map
 *   tex[9] #e7b6ae63                    (no file)   -> map
 *   tex[10] #9dbd80db                    (no file)   -> map
 *   tex[11] #06f7d6c7                    (no file)   -> map
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
export const sebenco_snow: MaterialFactory = {
  name: "sebenco_snow.rcsmaterial",
  minTextures: 1,
  maxTextures: 12,
  make: (textures: THREE.Texture[]) => {
    const [lightMap, map, normalMap, map1, _unused4, map2, map3, map4, map5, map6, map7, map8] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      ...(map8 ? { map: map8 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
