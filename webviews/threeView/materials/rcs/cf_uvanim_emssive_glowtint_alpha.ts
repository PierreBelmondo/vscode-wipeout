import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials/cf_uvanim_emssive_glowtint_alpha.rcsmaterial
 *
 *   tex[0] Texture1                     auricom_stars.gtf, auricom_stars_distant.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #1b894442                    (no file)   -> map
 *   tex[3] #e8bcd7f5                    (no file)   -> map
 *   tex[4] #87d769dc                    (no file)   -> map
 *   tex[5] #2481ef75                    (no file)   -> map
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
export const cf_uvanim_emssive_glowtint_alpha: MaterialFactory = {
  name: "cf_uvanim_emssive_glowtint_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
