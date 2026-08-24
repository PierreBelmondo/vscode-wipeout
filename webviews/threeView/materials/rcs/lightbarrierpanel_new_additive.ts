import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/lightbarrierpanel_new_additive.rcsmaterial
 *
 *   tex[0] #2d006ed5                    lightbarrier_hexagons.gtf   -> map
 *   tex[1] #8590dfc5                    lightbarrier_panelpulsing.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #69d42acc                    (no file)   -> map
 *   tex[4] Colour                       (no file)   -> unused
 *   tex[5] #d0989794                    (no file)   -> map
 *   tex[6] #31182e0d                    (no file)   -> map
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
export const lightbarrierpanel_new_additive: MaterialFactory = {
  name: "lightbarrierpanel_new_additive.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, _unused4, map3, map4] = textures;
    return new PulsingMaterial({
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
