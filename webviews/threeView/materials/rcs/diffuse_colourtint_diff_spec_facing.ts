import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/diffuse_colourtint_diff_spec_facing.rcsmaterial
 *
 *   tex[0] DiffuseTexture               and_pearl_diff.gtf   -> map
 *   tex[1] #20c3e476                    mr_pearl_spec.gtf   -> specularMap
 *   tex[2] #994bbcf1                    dc_ag_gradanim.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track_section1_02-lmap.gtf   -> lightMap
 *   tex[4] #63617681                    (no file)   -> map
 *   tex[5] #901d9fa8                    (no file)   -> map
 *   tex[6] #2924e4ad                    (no file)   -> map
 *   tex[7] #da67aa34                    (no file)   -> map
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
export const diffuse_colourtint_diff_spec_facing: MaterialFactory = {
  name: "diffuse_colourtint_diff_spec_facing.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
