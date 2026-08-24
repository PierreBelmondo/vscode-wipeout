import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/martin_inflatable.rcsmaterial
 *
 *   tex[0] #d2811847                    spectrum.gtf   -> map
 *   tex[1] #e89817d7                    reflectcells.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #c82a30fe                    bumpycones_normal.gtf   -> normalMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #134ba657                    (no file)   -> map
 *   tex[6] #7de593c6                    (no file)   -> map
 *   tex[7] #6be7990e                    (no file)   -> map
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
export const martin_inflatable: MaterialFactory = {
  name: "martin_inflatable.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, normalMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
