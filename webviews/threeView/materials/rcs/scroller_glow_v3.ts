import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/scroller_glow_v3.rcsmaterial
 *
 *   tex[0] #7ae5e199                    scroller_glow_b_alpha.gtf, scroller_glow_o_alpha.gtf   -> map
 *   tex[1] #0281588c                    dc_scroll_hex_alpha.gtf, scroller_hex_b_alpha.gtf, scroller_hex_o_alpha.gtf   -> map
 *   tex[2] #173fbce2                    scroller_multiply.gtf, scroller_multiply_01.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[4] #e1d9e1e0                    (no file)   -> map
 *   tex[5] #ade9493a                    (no file)   -> map
 *   tex[6] #87d769dc                    (no file)   -> map
 *   tex[7] #46def239                    (no file)   -> map
 *   tex[8] #2481ef75                    (no file)   -> map
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
export const scroller_glow_v3: MaterialFactory = {
  name: "scroller_glow_v3.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
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
