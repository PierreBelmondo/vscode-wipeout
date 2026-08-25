import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffuse_texture_emissivealphascalar_colourtint.rcsmaterial
 *
 *   tex[0] DiffuseTexture               mr_tracklamp.gtf, and_lightband2_glow.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_07-lmap.gtf, ile_mesh_combine_track01_09-lmap.gtf   -> lightMap
 *   tex[2] #63617681                    (no file)   -> map
 *   tex[3] #ef18f362                    (no file)   -> map
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
export const diffuse_texture_emissivealphascalar_colourtint: MaterialFactory = {
  name: "diffuse_texture_emissivealphascalar_colourtint.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
