import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffusealfa4opacity_specscalar.rcsmaterial
 *
 *   tex[0] #90d6caf7                    pbtunnlgrill_da.gtf   -> map
 *   tex[1] Specular_Texture             pbtunnlgrill_s.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_03-lmap.gtf   -> lightMap
 *   tex[3] #71db09a8                    (no file)   -> map
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
export const diffusealfa4opacity_specscalar: MaterialFactory = {
  name: "diffusealfa4opacity_specscalar.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
