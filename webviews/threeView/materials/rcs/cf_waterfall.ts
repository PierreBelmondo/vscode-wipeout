import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/*\/materials/cf_waterfall.rcsmaterial
 *
 *   tex[0] t[0]      martin_waterfallspray_alphablend.gtf  -> map
 *   tex[1] t[1]      and_waterfoam_blend.gtf               -> alphaMap
 *   tex[2] lightmap                                        -> lightMap
 *
 * Falling spray. Both textures are `_alphablend`/`_blend`, so alpha blending
 * with depthWrite off.
 *
 * Permutation: idx 2 (Backend=Static, Permutation=Ambient, no shadow/spot
 *   bindings) -- the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. VP at file offset 0010d0, FP at
 *   file offset 001250.
 *
 * Animated: a one-axis (V) UV scroll. Both texture samples move along V only.
 *
 *   VP uniform table:
 *     #2481ef75  U  ?     c[464]  02010001
 *     #906b67ba  U  time  c[463]  02010001
 *
 *   VP code:
 *     0013c0+00c0: ADD o10(TEX3).y, v2.yyyy, c463.xxxx
 *     0013d0+00d0: MOV o10(TEX3).x, v2.xxxx
 *     001400+0100: MOV R0.w, c463.xxxx
 *     001440+0140: MAD o8(TEX1).w, R0.wwww, c464.xxxx, v2.yyyy
 *
 *   FP code:
 *     0012a0+0050: MOVR R0.y, f[TEX1].w
 *     0012b0+0060: MOVR R0.x, f[TEX0].w
 *     0012c0+0070: TEXR H1.w, R0, TEX0
 *     0012d0+0080: TEXR H0.xyzw, f[TEX3], TEX1
 *     0012e0+0090: MOVH H0.xyz, H0
 *     0012f0+00a0: MULH H0.w, H0, H1  ; END
 *
 * `time` is bound by name to c[463] and reaches the interpolators twice, both
 * times on the V component:
 *
 *   - TEX3.y = Uv.y + time            (the ADD, an implicit scale of 1.0)
 *   - TEX1.w = time * c464.x + Uv.y   (the MAD)
 *
 * The FP samples t[0] at (TEX0.w, TEX1.w) -- so TEX1.w is that sample's V --
 * and t[1] at f[TEX3], then multiplies the two into alpha. Neither U ever
 * carries a time term: `MOV o10(TEX3).x, v2.xxxx` is a straight passthrough
 * and TEX0.w (R0.x, the u slot of the first sample) is likewise untouched.
 * Hence rateU = 0.
 *
 * This corrects two earlier claims about this material. It is not a diagonal
 * multi-layer drift, so it no longer uses WaterMaterial; and it does not
 * "scroll faster and mostly downwards" -- the sign and speed were never
 * readable from the shader. The old -0.35 V rate was a guess presented as
 * fact; the rate here is ScrollingMaterial's own acknowledged guess.
 *
 * The scale on the t[0] channel is c464.x (#2481ef75), an unnamed per-material
 * uniform the loader patches at run time; it is not printed as a literal, so
 * the real speed cannot be read back from the SHO -- see ScrollingMaterial's
 * own TODO. There is no literal shader constant here (no "3.0"-style
 * multiplier as in ShieldMaterial), so no separate scale constant is
 * introduced; the V axis uses ScrollingMaterial's rate parameter directly.
 *
 * TODO: the two samples scroll at *different* V rates -- t[1] at raw `time`
 *   (scale 1.0) and t[0] at `time * c464.x`. ScrollingMaterial moves every
 *   channel it owns at one rate, so the foam and the spray stay locked here
 *   where the shader lets them slide past each other. Separating them needs a
 *   ShaderMaterial with a per-sampler UV offset.
 */
export const cf_waterfall: MaterialFactory = {
  name: "cf_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [spray, foam, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(spray ? { map: spray } : {}),
        ...(foam ? { alphaMap: foam } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        color: new THREE.Color(0xdff0f5),
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        shininess: 20,
      },
      0.0,
      0.05,
    );
  },
};
