import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffuse_spec_constant.rcsmaterial
 *
 *   tex[0] lightmap                     ile_mesh_combine_tracksurface_01-lmap.gtf, ile_mesh_combine_tracksurface_09-lmap.gtf   -> lightMap
 *   tex[1] diffuse                      (no file)   -> map
 *   tex[2] #3ff1e8c1                    (no file)   -> map
 *   tex[3] #438ddeff                    (no file)   -> map
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
export const diffuse_spec_constant: MaterialFactory = {
  name: "diffuse_spec_constant.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [lightMap, map, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
