import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/bluemetal.rcsmaterial
 *
 *   tex[0] DiffuseTexture               bluehorizontal.gtf, start01.gtf, bluehorizontal_large.gtf   -> map
 *   tex[1] #35281c78                    blue_metal_facing_ramp.gtf   -> map
 *   tex[2] #20c3e476                    blue_metal_spec.gtf   -> specularMap
 *   tex[3] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf   -> lightMap
 *   tex[4] #ef18f362                    (no file)   -> map
 *   tex[5] #901d9fa8                    (no file)   -> map
 *   tex[6] #f9db3a85                    (no file)   -> map
 *   tex[7] #7f4f482b                    (no file)   -> map
 *   tex[8] #da67aa34                    (no file)   -> map
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
export const bluemetal: MaterialFactory = {
  name: "bluemetal.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, specularMap, lightMap, map2, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
