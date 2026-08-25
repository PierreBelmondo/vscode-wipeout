import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

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
 * Not animated, despite the name. The fragment programs were checked for a
 * surviving use of the engine's `time` uniform (#906b67ba) and there is none.
 *
 * The plainest Static permutation that mentions it at all is idx 3 (FP-off
 * 001d50, crc=20cb81d5), which declares `time` at 001da4+0054 as
 * `#906b67ba U time c[122]` and genuinely fetches it -- but then throws the
 * result away:
 *
 *     MOVR R2.zw, f[TEX4].xxxy                          ; the UV
 *     MULR R0.xy, R2.zwzz, {?, time, 0, 0}.xyxx         ; UV scaled by time
 *     MULR R0.xy, R0, {0, 0, 0, 0}.x                    ; ...times 0.0
 *     MADR R0.zw, R2.x, {0, 0, 0, 0}.x, R0.xxxy         ; still 0
 *     TEXR R0.x, R0.zwzz, TEX0                          ; sampled at (0, 0)
 *
 * The literal 0.0 multiply kills the time-scaled term before it can reach the
 * sample, so nothing visible moves. The same MULR-by-{4,1,0,0}-then-MULR-by-
 * {0,0,0,0} shape recurs with plain literals in place of `time` (e.g. the
 * ZAlphaOnly permutation, idx 1 at FP-off 0016e0), which marks it as a
 * disabled distortion branch left in by the permutation combiner rather than a
 * real heathaze.
 *
 * The richer no-shadow Static permutation this factory would actually use
 * (idx 15/18, FP-off 004a20, crc=fc1406e4) declares `time` at 004ad4+00b4 but
 * never names it in any of the ~150 instructions from 004bf0 to 005240.
 *
 * An earlier revision of this file used PulsingMaterial and described an
 * emissive pulse; no permutation was found in which `time` drives a surviving
 * colour or UV term, so that has been removed. If a live heathaze exists it
 * would be in a Shadow/Spot permutation this project does not implement.
 */
export const emissive_alpha_heathaze_test: MaterialFactory = {
  name: "emissive_alpha_heathaze_test.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
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
