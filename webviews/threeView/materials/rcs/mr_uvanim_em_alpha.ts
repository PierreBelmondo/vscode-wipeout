import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/mr_uvanim_em_alpha.rcsmaterial
 *
 *   tex[0] Texture1                     als_arrows_of_doom2_glow.gtf, als_arrows_of_doom_blend_glow.gtf, mar_holohgrams.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #87d769dc                    (no file)   -> map
 *   tex[3] #2481ef75                    (no file)   -> map
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
export const mr_uvanim_em_alpha: MaterialFactory = {
  name: "mr_uvanim_em_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
