import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/cf_diff_spec.rcsmaterial
 *
 *   tex[0] DiffuseTexture               and_eggmetal.gtf, and_metalstrip.gtf, and_metalpanel_diff.gtf   -> map
 *   tex[1] #20c3e476                    and_eggmetal_spec.gtf, and_metalstrip_spec.gtf, and_metalpanel_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track03_01-lmap.gtf, ile_mesh_combine_track03_02-lmap.gtf, ile_mesh_combine_track03_03-lmap.gtf   -> lightMap
 *   tex[3] #4c3cae3a                    (no file)   -> map
 *   tex[4] #2924e4ad                    (no file)   -> map
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
export const cf_diff_spec: MaterialFactory = {
  name: "cf_diff_spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
