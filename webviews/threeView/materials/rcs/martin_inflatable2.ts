import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/martin_inflatable2.rcsmaterial
 *
 *   tex[0] lightmap                     (no file)   -> lightMap
 *   tex[1] #c82a30fe                    bumpycones_normal.gtf   -> normalMap
 *   tex[2] #7611a2d8                    (no file)   -> map
 *   tex[3] #134ba657                    (no file)   -> map
 *   tex[4] #7de593c6                    (no file)   -> map
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
export const martin_inflatable2: MaterialFactory = {
  name: "martin_inflatable2.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [lightMap, normalMap, map, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
