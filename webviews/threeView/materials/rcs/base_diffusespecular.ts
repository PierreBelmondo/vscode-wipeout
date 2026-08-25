import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/base_diffusespecular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_cement_base_edges.gtf, dc_edgingstrips.gtf, dc_basewallconcrete.gtf   -> map
 *   tex[1] #20c3e476                    dc_cement_base_edges_specular.gtf, dc_edgingstripsspecular.gtf, dc_basewallconcretespecular.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf   -> lightMap
 *   tex[3] #370a63cb                    (no file)   -> map
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
export const base_diffusespecular: MaterialFactory = {
  name: "base_diffusespecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
