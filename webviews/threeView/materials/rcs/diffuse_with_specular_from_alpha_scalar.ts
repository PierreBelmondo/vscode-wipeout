import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/diffuse_with_specular_from_alpha_scalar.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              talons_support_struts.gtf, talons_support_base.gtf   -> map
 *   tex[1] Texture1                     talons_support_struts_ems.gtf, talons_support_base_ems.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf   -> lightMap
 *   tex[3] #6a30e9cd                    (no file)   -> map
 *   tex[4] #4232e459                    (no file)   -> map
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
export const diffuse_with_specular_from_alpha_scalar: MaterialFactory = {
  name: "diffuse_with_specular_from_alpha_scalar.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
