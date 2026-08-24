import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/and_diffuse_emissive_spec.rcsmaterial
 *
 *   tex[0] Diffuse                      and_lightband.gtf   -> map
 *   tex[1] Emissive                     and_lightband_emis.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section1_02-lmap.gtf, ile_mesh_combine_track_section1_01-lmap.gtf   -> lightMap
 *   tex[3] #b6a7c284                    (no file)   -> map
 *   tex[4] #1435afb6                    (no file)   -> map
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
export const and_diffuse_emissive_spec: MaterialFactory = {
  name: "and_diffuse_emissive_spec.rcsmaterial",
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
