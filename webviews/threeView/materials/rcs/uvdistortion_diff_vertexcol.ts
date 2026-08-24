import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/uvdistortion_diff_vertexcol.rcsmaterial
 *
 *   tex[0] diffuse                      and_station_strip.gtf, and_pipelight.gtf   -> map
 *   tex[1] emissive                     and_line_rgb_clouds_alpha.gtf, dc_ag_gradanim.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section4_04-lmap.gtf, ile_mesh_combine_track_section4_01-lmap.gtf, ile_mesh_combine_track_section4_05-lmap.gtf   -> lightMap
 *   tex[3] #d0989794                    (no file)   -> map
 *   tex[4] #961662ae                    (no file)   -> map
 *   tex[5] #2bdce348                    (no file)   -> map
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
export const uvdistortion_diff_vertexcol: MaterialFactory = {
  name: "uvdistortion_diff_vertexcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
