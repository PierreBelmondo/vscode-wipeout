import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/cf_uvanim_emssive_glowtint.rcsmaterial
 *
 *   tex[0] Texture1                     and_tower_glow.gtf, and_bluestreak_glow_newalpha.gtf, and_bluestreak_pulse.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine8-lmap.gtf   -> lightMap
 *   tex[2] #e8bcd7f5                    (no file)   -> map
 *   tex[3] #87d769dc                    (no file)   -> map
 *   tex[4] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: a UV scroll on *both* axes, and it happens in the VERTEX program,
 * not the fragment one. Permutation idx 53 "Static/Ambient" (VP-off 006e20)
 * declares `time` (#906b67ba, c[467]) alongside two unresolved-but-real
 * uniforms c[465]/c[466], and threads it into the TEX0 texcoord:
 *
 *     MOV R1.x, c467.xxxx                        ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c466.xxxx, v1.xxxx ; U' = time * rateU + U
 *
 * `time` is copied into R1.x and then consumed by name in both MADs, so it is
 * unambiguously the source rather than a coincidental reuse of R1. Two separate
 * multipliers (c465 for V, c466 for U) means the axes scroll independently --
 * this is not a single shared rate, and not a V-only scroll, so both rates are
 * passed explicitly below rather than left to ScrollingMaterial's V-only
 * defaults. The same time->R1.x->MAD-into-TEX0.xy idiom repeats verbatim in the
 * higher permutation at VP-off 007070, so it is the material's consistent
 * scroll idiom and not a one-off.
 *
 * The fragment program (crc=50c4f12f) does not participate in the animation:
 *
 *     TEXR H0.xyz, f[TEX0], TEX0                 ; sample at the scrolled coord
 *     MULH H0.xyz, H0, {0(0), 0(0), 0(0), 0(0)}  ; a real hardcoded zero
 *
 * It samples the already-scrolled interpolated coordinate and never touches
 * `time` itself. `GlowTint` (#e8bcd7f5, c[44]) is declared in this
 * permutation's uniform table but is referenced by no instruction in it.
 *
 * There is no literal scale factor on either MAD -- unlike ShieldMaterial's
 * 3.0, the multiplicands here are the c465/c466 uniform slots themselves, so
 * there is no shader constant to name. Their hashes went unresolved by the
 * disassembler, so the two rates below are placeholders of the right shape
 * (both axes non-zero, independent) and not recovered values.
 *
 * Permutation: idx 53 "Static/Ambient" (VP-off 006e20, FP-off 006240) -- the
 *   lit, Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts).
 *   The others are TODO.
 *
 * TODO: recover the real scroll rates. c465/c466 are per-frame-patched uniform
 *   slots whose hashes are not in the database, so they would have to come from
 *   the engine's material setup rather than the shader bundle.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const cf_uvanim_emssive_glowtint: MaterialFactory = {
  name: "cf_uvanim_emssive_glowtint.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      // U from c466, V from c465 -- both MADs are live, so neither rate is 0.
      0.05,
      0.05,
    );
  },
};
