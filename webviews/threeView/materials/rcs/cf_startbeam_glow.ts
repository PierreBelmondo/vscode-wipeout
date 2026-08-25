import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/cf_startbeam_glow.rcsmaterial
 *
 *   tex[0] Texture1                     cf_startline.gtf, and_fizzypower2_glow_add.gtf, mar_fizzypower2_glow_add.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine6-lmap.gtf, ile_mesh_combine22-lmap.gtf, ile_mesh_combine20-lmap.gtf   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 53 (Backend=Static, Permutation=Ambient, no shadow/spot
 *   bindings) -- the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. VP at file offset 005df0, FP at
 *   file offset 0053b0.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a one-axis (V) UV scroll of the coordinate used to sample
 * Texture1 / `map`.
 *
 *   VP uniform table:
 *     005e24+0034: #906b67ba  U  time      c[467]  02010001
 *
 *   VP code:
 *     005e50+0060: ADD o7(TEX0).y, v1.yyyy, c467.xxxx
 *     005e60+0070: MUL R0.xyzw, v0.yyyy, c257.xyzw
 *     005e70+0080: MAD R0.xyzw, v0.xxxx, c256.xyzw, R0.xyzw
 *     005e80+0090: MAD R0.xyzw, v0.zzzz, c258.xyzw, R0.xyzw
 *     005e90+00a0: MOV o7(TEX0).x, v1.xxxx
 *     005ea0+00b0: ADD o0(HPOS).xyzw, R0.xyzw, c259.xyzw  ; END
 *
 *   FP code:
 *     0053f0+0040: TEXR H0.xyzw, f[TEX0], TEX0  ; END
 *
 * `time` is bound by name to c[467] (uc=1) in this VP's uniform table, so
 * c467 is a real named-uniform read and not a misresolved zero literal. The
 * ADD computes TEX0.y = Uv1.y + time, while TEX0.x is a straight passthrough
 * of Uv1.x (`MOV o7(TEX0).x, v1.xxxx`, no time) -- hence rateU = 0 and only
 * the V axis moves. The FP is a bare passthrough: one TEXR sampling Texture1 /
 * `map` at that scrolled varying, with no reference to `time` or any other
 * uniform. So the base texture slides along V; there is no second sampler, no
 * colour ramp and no emissive term driven by the clock.
 *
 * The same `ADD o7(TEX0).y, v1.yyyy, c467.xxxx` followed by a plain TEXR on
 * TEX0 recurs identically in every other permutation carrying this VP body
 * (the groups at VP-off 005df0, 006010+ HalfBright* variants, 006130
 * shadow-to-alpha variants), all scrolling .y only -- so this is the
 * material's real behaviour rather than an artifact of one permutation.
 *
 * Note this contradicts an earlier reading of this material as an emissive
 * pulse: nothing here modulates a colour or emissive term with `time`, so the
 * factory no longer uses PulsingMaterial.
 *
 * The ADD takes `time` straight from c467.xxxx with coefficient 1 -- there is
 * no rate register and no literal multiplier in the instruction (no
 * "3.0"-style constant as in ShieldMaterial), so no scale constant is
 * introduced here. The engine's own clock scale is the only unknown, which is
 * what ScrollingMaterial's rate parameter stands in for; see its TODO.
 */
export const cf_startbeam_glow: MaterialFactory = {
  name: "cf_startbeam_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.0,
      0.05,
    );
  },
};
