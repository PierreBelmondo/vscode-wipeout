import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/animlights.rcsmaterial
 *
 *   tex[0] Texture1                     dc_lightspage.gtf   -> map
 *   tex[1] #dba0a35a                    dc_gradient_d.gtf   -> map (animated)
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #31182e0d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: #2 "Ambient", Backend=Static -- the lit, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). VP block @0x000fd0, FP block
 *   @0x001170. The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a U-axis UV scroll computed in the *vertex* program and passed down
 * as TEX3. Both `Speed` (#31182e0d, c[463]) and `time` (#906b67ba, c[464]) are
 * bound with the `V` prefix, so nothing time-driven happens in the FP at all:
 *
 *     ; VP @0x000fd0
 *     MOV o10(TEX3).yzw, v8.wwxy                    ; V and a second pair, static
 *     MOV R0.w, c463.xxxx                           ; R0.w = Speed
 *     MAD o10(TEX3).x, R0.wwww, c464.xxxx, v8.zzzz  ; U' = Speed * time + v8.z
 *
 *     ; FP @0x001170   t[0] = #3bdc0403 Texture1, t[1] = #dba0a35a
 *     TEXR H0.xyzw, f[TEX3].zwzz, TEX0              ; Texture1 at (.z, .w)  <- static
 *     TEXR H1.xyz,  f[TEX3],      TEX1              ; tex[1] at (.x, .y)    <- moves
 *     MULH H0.xyz, H1, H0                           ; scrolled gradient over the base
 *
 * The VP packs two independent UV pairs into one varying: TEX3.yzw come
 * straight from v8.wwxy with no time term, and only TEX3.x carries the MAD.
 * Which sampler animates is therefore decided by the TEXR swizzles -- Texture1
 * reads the static `.zw` pair, while the #dba0a35a gradient has no swizzle and
 * so defaults to `.xy`, the scrolled one. Only the gradient scrolls, and only
 * along U; hence rateV = 0, and hence tex[1] is the `map` that wins below,
 * since ScrollingMaterial only offsets the channel it ends up holding.
 * `MULH H0.xyz, H1, H0` multiplies that moving gradient over the still base
 * sample, which is what produces the running-lights look.
 *
 * There is no hardcoded literal multiplied into the time term -- nothing like
 * ShieldMaterial's `3.0` to apply. The only scale is the `Speed` uniform,
 * whose binding code 000301cf marks it as a material-parameter-block value
 * (against time's engine-fed c00001d0), so it is authored per material and is
 * not recoverable from the SHO. Both MAD operands resolve to named uniforms,
 * so this is a genuine time-driven scroll and not a misread `0x00000000(0)`
 * literal. The same `MOV Rn, c463` + `MAD o<varying>.x, Rn, c464, v8.zzzz`
 * pair appears in all 13 animated permutations (only the register and varying
 * index differ), so the U-only axis is the material's real behaviour rather
 * than an artifact of #2.
 *
 * NOTE: an earlier revision of this file claimed the shader "modulates the
 * emissive term" and used PulsingMaterial. The disassembly above shows a UV
 * scroll and no emissive modulation anywhere; that claim was wrong. It also
 * bound all four textures to `map`, so only tex[3] survived the spread.
 *
 * TODO: recover `Speed` (#31182e0d, c463) from the engine's material setup so
 *   the scroll runs at the real rate; 0.05 below is the placeholder drift
 *   described in _animated.ts.
 */
export const animlights: MaterialFactory = {
  name: "animlights.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        // tex[1] (#dba0a35a) is the one the shader scrolls, so it is the `map`
        // that wins: ScrollingMaterial only offsets the channel it holds.
        ...(map1 ? { map: map1 } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      // U scrolls, V does not -- TEX3.x is the only component time reaches.
      0.05,
      0.0,
    );
  },
};
