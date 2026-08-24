import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/emissivealphalights.rcsmaterial
 *
 *   tex[0] Emissive_Texture             dc_lightspage.gtf   -> emissiveMap
 *   tex[1] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[2] #7611a2d8                    (no file)   -> map
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
export const emissivealphalights: MaterialFactory = {
  name: "emissivealphalights.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, lightMap, map] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
