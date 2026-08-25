import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { CrossScrollMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/dc_hologramwithstatic2.rcsmaterial
 *
 *   tex[0] Texture1                     advert_a.gtf   -> map        (U-scrolled)
 *   tex[1] #dba0a35a                    dc_gradient_horizontal.gtf   -> emissiveMap (V-scrolled)
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #31182e0d "Speed"            (no file)   -> unused (a VP scalar, not an image)
 *   tex[4] #b6573513                    (no file)   -> unused (a VP scalar, not an image)
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: Idx=2 "Ambient", Backend=Static -- the lit, Ambient, no-shadow,
 *   no-spot point of the matrix (see _abstract.ts). VP block @0x000f50,
 *   FP block @0x001110. The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the scroll lives entirely in the *vertex* program -- `time`
 * (#906b67ba) is bound here as a VERTEX uniform (binding c00001d0, c[464]), so
 * grepping only the fragment program for `time` finds nothing and wrongly
 * concludes this material is static. The VP builds ONE interpolator carrying
 * both a U-scrolled and a V-scrolled copy of Uv1, with c463 = `Speed`
 * (#31182e0d) and c462 = an unnamed per-material rate (#b6573513):
 *
 *     001030+00e0: MOV o10(TEX3).yz, v2.yyxy         ; y = Uv1.y, z = Uv1.x  (untouched)
 *     001050+0100: MOV R0.w, c464.xxxx               ; R0.w = time
 *     001060+0110: MAD o10(TEX3).w, R0.wwww, c462.xxxx, v2.yyyy ; w = Uv1.y + time * #b6573513
 *     001080+0130: MAD o10(TEX3).x, R0.wwww, c463.xxxx, v2.xxxx ; x = Uv1.x + time * Speed
 *
 * giving TEX3 = (U', Uv1.y, Uv1.x, V'). The FP then samples two DIFFERENT
 * textures through the two halves of it and SUMS them:
 *
 *     001160+0050: TEXR H1.xyz, f[TEX3].zwzz, TEX1   ; #dba0a35a at (Uv1.x, V') -> V only
 *     001170+0060: TEXR H0.xyz, f[TEX3], TEX0        ; Texture1  at (U', Uv1.y) -> U only
 *     001180+0070: ADDH H0.xyz, H0, H1  ; END        ; additive, not multiply
 *
 * The `.zwzz` swizzle is load-bearing: it routes the untouched z into u and the
 * time-offset w into v, so the gradient scrolls vertically while the advert
 * scrolls horizontally. Reading the two TEXRs without decoding that swizzle
 * gets the axes backwards. Hence CrossScrollMaterial rather than
 * ScrollingMaterial, which drives all its channels off one shared rate pair and
 * so cannot scroll two textures along opposite axes.
 *
 * Permutations 3-6 carry a structurally identical c464 -> MAD with c462/c463
 * into TEX3/TEX4/TEX5 .w and .x, so this is the material's real behaviour
 * rather than an artifact of #2.
 *
 * Only 2 of the 5 declared textures are sampled in this permutation: the FP
 * declares just t[0] Texture1 and t[1] #dba0a35a. tex[3] and tex[4] carry the
 * hashes of `Speed` and #b6573513 because the channel table lists them as
 * sampler slots, but the shader reads both as vertex-program scalars, so there
 * is no image to bind. (The previous version of this factory spread all five
 * onto the single `map` key, where four assignments were silently overwritten
 * by the last one.)
 *
 * No literal scale to apply, unlike ShieldMaterial's `3.0`: both multiplies
 * take a resolved uniform and neither carries an inline constant. The genuine
 * inline zeros elsewhere in this file (e.g. perm 3's
 * `MADR R1.xyz, -{0x00000000(0), ...}, R1.w, {0x00000000(0), ...}`) are real
 * zeros unrelated to `time`.
 *
 * TODO: resolve `Speed` (#31182e0d) and #b6573513 via the engine's material
 *   setup; the rates below are placeholder drifts and only the axes are
 *   recovered.
 */
export const dc_hologramwithstatic2: MaterialFactory = {
  name: "dc_hologramwithstatic2.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [texture1, gradient, lightMap] = textures;
    return new CrossScrollMaterial(
      {
        side: THREE.DoubleSide,
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(gradient ? { emissive: new THREE.Color(0xffffff) } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      texture1,
      gradient,
      0.05,
      0.05,
    );
  },
};
