import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/adverts/nr_tvarray_02.rcsmaterial
 *
 *   tex[0] DiffuseTexture               red_billboard.gtf, billboard2.gtf, ag_landscape02.gtf   -> map
 *   tex[1] #670f5c80                    tvcell.gtf, hologramscanlines.gtf   -> map
 *   tex[2] #c3d0b99e                    animgradient_stepcycle.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #e3daf98c                    (no file)   -> map
 *   tex[5] #26f8871a                    (no file)   -> map
 *   tex[6] #134ba657                    (no file)   -> map
 *   tex[7] #7de593c6                    (no file)   -> map
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
export const nr_tvarray_02: MaterialFactory = {
  name: "nr_tvarray_02.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
