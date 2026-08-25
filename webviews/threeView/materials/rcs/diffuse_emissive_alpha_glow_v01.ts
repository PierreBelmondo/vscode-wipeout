import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/diffuse_emissive_alpha_glow_v01.rcsmaterial
 *
 *   tex[0] #6f9e6faf                    striplights.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf   -> lightMap
 *   tex[2] #8f3d0540                    (no file)   -> map
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
export const diffuse_emissive_alpha_glow_v01: MaterialFactory = {
  name: "diffuse_emissive_alpha_glow_v01.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
