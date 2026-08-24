import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/cf_constantcolourglow_ramp_02.rcsmaterial
 *
 *   tex[0] #76fc220b                    gradient_firey_01.gtf, gradient_aimi_01.gtf   -> map
 *   tex[1] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #1c96b9d6                    smoke.gtf   -> map
 *   tex[4] #6d0178af                    (no file)   -> map
 *   tex[5] #d5814b74                    (no file)   -> map
 *   tex[6] #bbe42ccd                    (no file)   -> map
 *   tex[7] #68d512e9                    (no file)   -> map
 *   tex[8] #8f3d0b43                    (no file)   -> map
 *   tex[9] #e0dcab49                    (no file)   -> map
 *   tex[10] #5963a112                    (no file)   -> map
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
export const cf_constantcolourglow_ramp_02: MaterialFactory = {
  name: "cf_constantcolourglow_ramp_02.rcsmaterial",
  minTextures: 1,
  maxTextures: 11,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8, map9] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      ...(map8 ? { map: map8 } : {}),
      ...(map9 ? { map: map9 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
