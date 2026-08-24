import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/nr_holobowlparallax.rcsmaterial
 *
 *   tex[0] Texture2                     bumpycones_normal.gtf, hologramscanlines.gtf   -> map
 *   tex[1] #bbb9b139                    animgradient_bowl.gtf, smoke.gtf   -> map
 *   tex[2] diffuseTexture               auricom_landscape01.gtf, qirex02_flat.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #134ba657                    (no file)   -> map
 *   tex[5] #7de593c6                    (no file)   -> map
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
export const nr_holobowlparallax: MaterialFactory = {
  name: "nr_holobowlparallax.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
