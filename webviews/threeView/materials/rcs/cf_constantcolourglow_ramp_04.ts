import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/cf_constantcolourglow_ramp_04.rcsmaterial
 *
 *   tex[0] Colour                       feisar_landscape01_a.gtf, feisar_landscape03_flat.gtf   -> unused
 *   tex[1] #76fc220b                    gradient_aimi_01.gtf   -> map
 *   tex[2] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #1c96b9d6                    smoke.gtf   -> map
 *   tex[5] #6d0178af                    (no file)   -> map
 *   tex[6] #d5814b74                    (no file)   -> map
 *   tex[7] #bbe42ccd                    (no file)   -> map
 *   tex[8] #68d512e9                    (no file)   -> map
 *   tex[9] #8f3d0b43                    (no file)   -> map
 *   tex[10] #e0dcab49                    (no file)   -> map
 *   tex[11] #5963a112                    (no file)   -> map
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
export const cf_constantcolourglow_ramp_04: MaterialFactory = {
  name: "cf_constantcolourglow_ramp_04.rcsmaterial",
  minTextures: 1,
  maxTextures: 12,
  make: (textures: THREE.Texture[]) => {
    const [_unused0, map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8, map9] = textures;
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
