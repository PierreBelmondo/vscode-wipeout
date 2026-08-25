import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/04_chenghou_project/materials/cf_chenghou_sign.rcsmaterial
 *
 *   tex[0] Texture1                     jd_chenghou_robotsanim_01.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 53 (Backend=Static, Permutation=Ambient, no shadow/spot
 *   bindings) -- the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. VP at file offset 006010
 *   (size 0100), FP at file offset 0054b0 (size 0070).
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a one-axis (V) UV scroll of the coordinate used to sample
 * Texture1 / `map`.
 *
 *   VP uniform table:
 *     006028+0018: #427214fc  A  Uv1            v[1]
 *     006038+0028: #b9d31b0a  A  position       v[0]
 *     006040+0030: #2e7d5f33  U  viewProj       c[256]  02040004
 *     00604c+003c: #906b67ba  U  time           c[467]  02010001
 *
 *   VP code:
 *     006090+0080: MOV o7(TEX0).xyz, v2.xyzx
 *     0060a0+0090: MOV o8(TEX1).x, v1.xxxx
 *     0060b0+00a0: MOV R1.x, c466.xxxx
 *     0060f0+00e0: MAD o8(TEX1).y, R1.xxxx, c467.xxxx, v1.yyyy
 *     006100+00f0: ADD o0(HPOS).xyzw, R0.xyzw, c259.xyzw  ; END
 *
 *   FP code:
 *     0054f0+0040: MOVH H1.xyz, f[TEX0]
 *     005500+0050: TEXR H0.xyz, f[TEX1], TEX0
 *     005510+0060: MULH H0.xyz, H1, H0  ; END
 *
 * `time` is bound by name to c[467]. The MAD computes TEX1.y = c466.x * time
 * + Uv1.y, so only the V component moves; TEX1.x is a straight passthrough of
 * Uv1.x (`MOV o8(TEX1).x, v1.xxxx`, no time), hence rateU = 0. The FP samples
 * Texture1 at f[TEX1] and multiplies by the vertex-colour interpolant carried
 * in TEX0 -- so in this permutation TEX0 is VertexColour1, not the primary UV,
 * and TEX1 is the time-scrolled Uv1 that actually feeds the sample.
 *
 * Note this contradicts an earlier reading of this material as an emissive
 * pulse: nothing here modulates a colour or emissive term with `time`, so the
 * factory no longer uses PulsingMaterial.
 *
 * The scroll rate multiplier is c466.x, an unnamed constant that did not
 * resolve to a uniform in this permutation's table and is not printed as a
 * literal in the disassembly, so the real rate cannot be read back from the
 * SHO -- see ScrollingMaterial's own TODO. There is no literal shader constant
 * here (no "3.0"-style multiplier as in ShieldMaterial), so no separate scale
 * constant is introduced; the V axis uses ScrollingMaterial's rate parameter
 * directly.
 */
export const cf_chenghou_sign: MaterialFactory = {
  name: "cf_chenghou_sign.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      0.05,
    );
  },
};
