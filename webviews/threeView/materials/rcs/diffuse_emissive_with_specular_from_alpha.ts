import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffuse_emissive_with_specular_from_alpha.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              j_t_barrier1.gtf, talons_support_base.gtf, tunnel_02_floors.gtf   -> map
 *   tex[1] Texture1                     j_t_barrier1_ems.gtf, talons_support_base_ems.gtf, tunnel_02_floor_ems.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track03_04-lmap.gtf, ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_010-lmap.gtf   -> lightMap
 *   tex[3] #4232e459                    (no file)   -> map
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
export const diffuse_emissive_with_specular_from_alpha: MaterialFactory = {
  name: "diffuse_emissive_with_specular_from_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
