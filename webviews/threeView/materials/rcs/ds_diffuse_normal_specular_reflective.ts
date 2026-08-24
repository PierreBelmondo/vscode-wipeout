import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/12_sol_2/materials/ds_diffuse_normal_specular_reflective.rcsmaterial
 *
 *   tex[0] Texture1                     ds_track_wall_rh_c.gtf, ds_track_wall_lh_c.gtf   -> map
 *   tex[1] Texture2                     ds_track_wall_rh_n.gtf, ds_track_wall_lh_n.gtf   -> normalMap
 *   tex[2] Texture3                     ds_track_wall_rh_r.gtf, ds_track_wall_lh_r.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine20-lmap.gtf   -> lightMap
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
export const ds_diffuse_normal_specular_reflective: MaterialFactory = {
  name: "ds_diffuse_normal_specular_reflective.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
