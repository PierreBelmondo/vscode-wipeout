import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/cf_billboard1.rcsmaterial
 *
 *   tex[0] Emissive                     lunar_bits.gtf, magic_bits_shopfront.gtf, mind_bits.gtf   -> emissiveMap
 *   tex[1] lightmap                     ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
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
export const cf_billboard1: MaterialFactory = {
  name: "cf_billboard1.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
