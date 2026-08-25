import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/04_chenghou_project/materials/jd_landinglights.rcsmaterial
 *
 *   tex[0] Texture1                     jd_sebenco_lightlens_01.gtf, jd_chenghou_flashlight_02.gtf   -> map
 *   tex[1] Texture2                     jd_chenghou_landinglight_02.gtf, jd_chenghou_flashlight_01.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2 (Backend=Static, Permutation=Ambient, no shadow/spot
 *   bindings) -- the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. VP at file offset 001c90,
 *   FP at file offset 001de0.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a one-axis (V) UV scroll of the coordinate used to sample
 * Texture2 -- the landing lights "flow" along the strip.
 *
 *   VP @001c90 (crc=2f134d1e), uniform table:
 *     001cd8+0048: #906b67ba  U  time           c[464]  02010001
 *
 *   VP code:
 *     001d20+0090: MOV o7(TEX0).w, v8.zzzz
 *     001d30+00a0: ADD o8(TEX1).w, v8.wwww, c464.xxxx
 *     001d40+00b0: MOV o8(TEX1).xyz, v1.xyzx
 *
 *   FP @001de0 (crc=fda0a317):
 *     001e40+0060: MOVR R0.y, f[TEX1].w        ; V = v8.w + time
 *     001e50+0070: MOVR R0.x, f[TEX0].w        ; U = v8.z, static
 *     001e60+0080: TEXR H1.xyz, R0, TEX1       ; Texture2 (t[1]) at (U, V)
 *
 * `time` is bound by name to c[464] and is ADDed straight onto vertex
 * attribute v8.w (an unnamed UV-like attribute, hash #1aefe524) with no
 * multiplier, so the shader's own scale factor is exactly 1.0 -- there is no
 * literal constant to carry across (no "3.0"-style multiplier as in
 * ShieldMaterial), and no per-material rate uniform either. The V rate below
 * is therefore ScrollingMaterial's plain rate parameter; see its TODO. Only
 * TEX1.w carries time, and U comes from the untouched f[TEX0].w, hence
 * rateU = 0. Texture1, sampled separately via f[TEX3] on unit TEX0 at 001e70,
 * does not move.
 *
 * Note this contradicts an earlier reading of this material as an emissive
 * pulse: nothing here modulates a colour or emissive term with `time`, so the
 * factory no longer uses PulsingMaterial.
 *
 * Caveat for whoever does the other permutations: idx 3 (Static, VP@001ed0,
 * FP@002040 -- adds directionalLight + fogColour + constantAmbientColour) has
 * a byte-identical VP pattern (o8(TEX1).w = v8.w + time), but its FP loads the
 * varying as `MOVR R1.xyzw, f[TEX1]` and then feeds only `MOVR R0.w, R1`
 * (default .x swizzle -- the vertex normal packed into TEX1.xyz, not the time
 * component) into the TEXR at 0021a0. The real R1.w is clobbered by
 * `MULR R1.w, -R0.x, R0.x` before any read, so in idx 3 `time` is computed and
 * then dropped. Do not assume the shared VP pattern means a permutation
 * actually consumes time -- idx 2 does, idx 3 does not.
 *
 * TODO: the two texture channels both land in Phong's single `map` slot, so
 *   Texture2 (the scrolling one, spread last) wins and Texture1 is dropped.
 *   That is the channel the trace animates, so the scroll is right, but the
 *   static lens layer is missing; sampling both would need a ShaderMaterial.
 */
export const jd_landinglights: MaterialFactory = {
  name: "jd_landinglights.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      0.05,
    );
  },
};
