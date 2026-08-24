import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/uvdistortion_diff_vertexcolplusoverlay.rcsmaterial
 *
 *   tex[0] #fb3f2dac                    feisar_square01.gtf, mr_line_rgb_clouds_alpha.gtf, and_ossego.gtf   -> map
 *   tex[1] diffuse                      mar_cellular_lamps_blue.gtf, dc_gradient.gtf, and_tunnelscreens_small.gtf   -> map
 *   tex[2] emissive                     and_station3_facing.gtf, mr_line_rgb_clouds_alpha.gtf, and_line_rgb_clouds_alpha.gtf   -> emissiveMap
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #d0989794                    (no file)   -> map
 *   tex[5] #96e30da5                    (no file)   -> map
 *   tex[6] #961662ae                    (no file)   -> map
 *   tex[7] #fe619466                    (no file)   -> map
 *   tex[8] #c0594d0e                    (no file)   -> map
 *   tex[9] #2bdce348                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the shader takes the engine's `time` uniform and offsets the
 * sample coordinate with it, so the texture channels scroll (see _animated.ts).
 */
export const uvdistortion_diff_vertexcolplusoverlay: MaterialFactory = {
  name: "uvdistortion_diff_vertexcolplusoverlay.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
