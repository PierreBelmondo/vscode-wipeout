import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/mr_shopwin_reflecttranspemis.rcsmaterial
 *
 *   tex[0] #7d661d43                    mr_shopwin_rgb.gtf   -> map
 *   tex[1] #d27475a1                    mr_shopwin_emissive_transp.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine12-lmap.gtf, ile_mesh_combine10-lmap.gtf, ile_mesh_combine9-lmap.gtf   -> lightMap
 *   tex[3] #9ce1ba7e                    (no file)   -> map
 *   tex[4] #42e008f7                    (no file)   -> map
 *   tex[5] #7eed37ae                    (no file)   -> map
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
export const mr_shopwin_reflecttranspemis: MaterialFactory = {
  name: "mr_shopwin_reflecttranspemis.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
