import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/emissive_alpha_heathaze_test.rcsmaterial
 *
 *   tex[0] #fd669142                    palms_alpha_small.gtf, rocks_01_matte_colour_alpha.gtf   -> map
 *   tex[1] #c39746d2                    fractal_noise.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #737084b2                    (no file)   -> map
 *   tex[4] #7eec5275                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #5b71c54f                    (no file)   -> map
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
export const emissive_alpha_heathaze_test: MaterialFactory = {
  name: "emissive_alpha_heathaze_test.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
