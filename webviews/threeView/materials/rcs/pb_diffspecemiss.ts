import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/pb_diffspecemiss.rcsmaterial
 *
 *   tex[0] DiffuseTexture               pb_bronzeold_swatch.gtf   -> map
 *   tex[1] #20c3e476                    pb_wingedman_s.gtf   -> specularMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] #ef18f362                    (no file)   -> map
 *   tex[5] #b2ce1eae                    (no file)   -> map
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
export const pb_diffspecemiss: MaterialFactory = {
  name: "pb_diffspecemiss.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
