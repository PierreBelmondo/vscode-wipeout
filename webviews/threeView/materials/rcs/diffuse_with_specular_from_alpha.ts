import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/diffuse_with_specular_from_alpha.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              al_ship.gtf, biofuel_diffuse.gtf, yacht_diff.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_03-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_07-lmap.gtf   -> lightMap
 *   tex[2] #4232e459                    (no file)   -> map
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
export const diffuse_with_specular_from_alpha: MaterialFactory = {
  name: "diffuse_with_specular_from_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
