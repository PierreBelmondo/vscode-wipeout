import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/tech_de_ra_cloud_effect.rcsmaterial
 *
 *   tex[0] Texture1                     cloud_02.gtf   -> map
 *   tex[1] Texture2                     cloud_01.gtf   -> map
 *   tex[2] Texture3                     cloud_mask_02.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #ef18f362                    (no file)   -> map
 *   tex[6] #981fc3f4                    (no file)   -> map
 *   tex[7] #87d769dc                    (no file)   -> map
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
 * Animated: the shader takes the engine's `time` uniform and modulates the
 * emissive term with it, so the glow pulses (see _animated.ts).
 */
export const tech_de_ra_cloud_effect: MaterialFactory = {
  name: "tech_de_ra_cloud_effect.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6, map7] = textures;
    return new PulsingMaterial({
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
