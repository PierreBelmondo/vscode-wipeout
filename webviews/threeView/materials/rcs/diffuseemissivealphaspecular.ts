import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffuseemissivealphaspecular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               pdn_light_01_ds.gtf, and_skistrut2_diff.gtf, and_yclamp_diff.gtf   -> map
 *   tex[1] #b1f2a176                    pdn_light_01_e.gtf, and_skistrut2_emissive.gtf, and_yclamp_emissive.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_03-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_07-lmap.gtf   -> lightMap
 *   tex[3] #4d60d566                    (no file)   -> map
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
export const diffuseemissivealphaspecular: MaterialFactory = {
  name: "diffuseemissivealphaspecular.rcsmaterial",
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
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
