import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/and_diffuse_emissive.rcsmaterial
 *
 *   tex[0] Diffuse                      and_metalpanel1.gtf, and_egglight.gtf, and_pipelight.gtf   -> map
 *   tex[1] Emissive                     and_metalpanel1_spec.gtf, and_egglight_emis.gtf, and_pipelightalpha_glow.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section4_04-lmap.gtf, ile_mesh_combine_track_section4_01-lmap.gtf, ile_mesh_combine_track_section4_06-lmap.gtf   -> lightMap
 *   tex[3] #b6a7c284                    (no file)   -> map
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
export const and_diffuse_emissive: MaterialFactory = {
  name: "and_diffuse_emissive.rcsmaterial",
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
