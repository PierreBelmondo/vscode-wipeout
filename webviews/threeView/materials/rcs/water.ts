import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/water.rcsmaterial
 *
 *   tex[0] #739a786e                    dc_waternormalmap.gtf   -> map
 *   tex[1] #62ae87a7                    dc_waternormalmap.gtf   -> map
 *   tex[2] #8365b1f3                    dc_waterreflection.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #4d60d566                    (no file)   -> map
 *   tex[5] #5e5b1937                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: 56, Static / HalfBrightAmbientSunSpot0 -- the plainest Static
 *   backend point of the matrix, with no shadow or spot textures bound
 *   (see _abstract.ts). VP block @0x00b5b0, FP block @0x00b820. The others are
 *   TODO, but idx 53 "Ambient" carries the identical scroll pattern (same
 *   c463/c460/c462/c461 usage), so this is the material's real behaviour and
 *   not an artifact of one permutation.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: `time` drives a UV scroll on *two* independent sets, not one. The
 * maths is in the vertex program, which packs both scrolled coordinates into
 * the single TEX3 interpolant -- .xy for one set, .zw for the other:
 *
 *     ; VP @0x00b5b0   c463 = #3059c884 "Time", c460 = UV2Scale,
 *     ;                c462 = Constant1, c461 = Constant2
 *     ADD R1.zw, v4.xxxy, c463.xxxx        ; Uv1 + Time, on both components
 *     MOV R1.x, c463.xxxx                  ; R1.x = Time
 *     MAD R1.xy, R1.xxxx, c460.xxxx, v4.xyxx ; Time * UV2Scale + Uv1
 *     MUL o10(TEX3).xy, R1.zwzz, c462.xxxx ; TEX3.xy = (Uv1 + Time) * Constant1
 *     MUL o10(TEX3).zw, R1.xxxy, c461.xxxx ; TEX3.zw = (Time*UV2Scale + Uv1) * Constant2
 *
 * and the fragment program samples the two normal maps straight off those two
 * halves of the interpolant:
 *
 *     ; FP @0x00b820
 *     TEXR R2.xyz, f[TEX3].zwzz, TEX1      ; map1 at the .zw coordinate
 *     TEXR R2.xyz, f[TEX3], TEX0           ; map  at the .xy coordinate
 *
 * Both axes of both sets are time-derived: the `v4.xxxy` and `R1.xxxy` swizzles
 * put a Time-offset value into the x slot as well as the y slot, so neither
 * pair is a single-axis scroll. Hence non-zero rateU *and* rateV below --
 * ScrollingMaterial's `rateU = 0.0` default would have wrongly pinned U.
 *
 * No literal scale to apply, unlike ShieldMaterial's `3.0`: every multiplier
 * here is a named per-material uniform -- UV2Scale, Constant1 and Constant2 --
 * resolved by name in the binding table, which confirms they are real uniforms
 * rather than literals decoded as constant slots. The true speeds are therefore
 * not recoverable from the SHO and the rates below are the usual guess.
 *
 * NOTE: c459 appears in nearby MAD instructions (c459.xxxx / c459.yyyy) but is
 * a leftover default constant slot -- `prelitScaleSpecular` in other
 * permutations -- and is not declared in this permutation's uniform table. It
 * is not `time` and was excluded from the trace.
 *
 * The remaining channels do not depend on `time` in this permutation: the
 * lightmap, the paraboloid reflection and the TEX2 normal-derived term are all
 * sampled at untouched coordinates.
 *
 * TODO: recover UV2Scale / Constant1 / Constant2. They would have to come from
 *   the engine's material setup rather than the shader bundle.
 */
export const water: MaterialFactory = {
  name: "water.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.05,
    );
  },
};
