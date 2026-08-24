import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_reflect_mult.rcsmaterial
 *
 *   tex[0] Texture1                     solarstation_piston_colour.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track03_02-lmap.gtf   -> lightMap
 *   tex[2] #6d0178af                    (no file)   -> map
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] #d5814b74                    (no file)   -> map
 *   tex[5] #8ed32c39                    (no file)   -> map
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
export const lambert_spec_reflect_mult: MaterialFactory = {
  name: "lambert_spec_reflect_mult.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
