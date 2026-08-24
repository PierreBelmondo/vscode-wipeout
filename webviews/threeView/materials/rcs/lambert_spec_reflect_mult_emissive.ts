import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_reflect_mult_emissive.rcsmaterial
 *
 *   tex[0] Emissive                     track_rail_01_emissive.gtf   -> emissiveMap
 *   tex[1] Texture1                     track_rail_01_colour_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_03-lmap.gtf, ile_mesh_combine_track01_04-lmap.gtf, ile_mesh_combine_track03_03-lmap.gtf   -> lightMap
 *   tex[3] #6d0178af                    (no file)   -> map
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #d5814b74                    (no file)   -> map
 *   tex[7] #8ed32c39                    (no file)   -> map
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
export const lambert_spec_reflect_mult_emissive: MaterialFactory = {
  name: "lambert_spec_reflect_mult_emissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, specularMap, lightMap, map, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
