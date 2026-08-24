import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/j_alphascalar.rcsmaterial
 *
 *   tex[0] Texture1                     egx_landscape02.gtf, auricom_landscape01.gtf, assegai_landscape02.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] Emissive                     (no file)   -> emissiveMap
 *   tex[3] #7e630448                    (no file)   -> map
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
export const j_alphascalar: MaterialFactory = {
  name: "j_alphascalar.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, emissiveMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
