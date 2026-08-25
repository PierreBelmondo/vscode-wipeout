import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials/cf_uvanim_emssive_glowtint_alpha.rcsmaterial
 *
 *   tex[0] Texture1                     auricom_stars.gtf, auricom_stars_distant.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #1b894442  AlphaIntensity    (no file)   -> not a texture; FP scalar c[56]
 *   tex[3] #e8bcd7f5  GlowTint          (no file)   -> not a texture; FP scalar c[58]
 *   tex[4] #87d769dc  U scroll rate     (no file)   -> not a texture; VP scalar c[466]
 *   tex[5] #2481ef75  V scroll rate     (no file)   -> not a texture; VP scalar c[465]
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable. Slots 2-5 never carry
 * a file because they are not samplers at all -- the FP preamble's patch table
 * binds #1b894442 and #e8bcd7f5 as scalars ('#1b894442 R AlphaIntensity c[1]'
 * at 0064b8, '#e8bcd7f5 R GlowTint c[0]' at 0064ba), and #87d769dc / #2481ef75
 * are declared in the VP as single floats ('02010001').
 *
 * Animated: a UV scroll on *both* axes, done entirely in the VERTEX program.
 * `time` (#906b67ba) is a VP uniform here and appears in no FRAGMENT block at
 * all. Permutation #53 "Static/Ambient" (VP-off 007040, crc=53b18909) declares
 * it at c[467] beside the two rate uniforms, then threads it into TEX0:
 *
 *     MOV R1.x, c467.xxxx                         ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c466.xxxx, v1.xxxx ; U' = time * rateU + U
 *
 * Two separate multipliers -- c466 (#87d769dc) for U, c465 (#2481ef75) for V --
 * so the axes scroll independently. Neither rate is 0, so both are passed
 * explicitly below rather than left to ScrollingMaterial's V-only defaults.
 *
 * There is NO literal scale on the time path: unlike ShieldMaterial's 3.0, the
 * multiplicands here are the c465/c466 uniform slots themselves, so there is no
 * shader constant to name and none is folded into the rates below. They are
 * placeholders of the right shape (both axes live, independent), not recovered
 * values.
 *
 * Cross-checked across permutations: the same three-instruction idiom appears
 * verbatim in the RigidBody VP (007290), and in the StaticQuake VP (006240) the
 * whole register file is shifted by the extra quake uniforms -- there time=c464,
 * U-rate=c463, V-rate=c462, and the MADs follow that shift exactly. The indices
 * tracking the uniform-table shift confirms the c-slot mapping is real rather
 * than a coincidence of one dump.
 *
 * Only `map` moves. The Static/Ambient FP (006480) contains exactly one TEXR,
 * on TEX0 -- 'TEXR H0.xyzw, f[TEX0], TEX0' then
 * 'MULH H0.xyz, H0, {AlphaIntensity, GlowTint, 0, 0}' -- so Texture1 is the
 * only channel sampled at the animated coordinate. This permutation has no
 * normalMap, emissiveMap or lightMap sample.
 *
 * The FP's last instruction is a genuine multiply by an inline zero
 * ('MULH H0.w, H0, {0,0,0,0}.x ; END'), not a misread patch site -- the patch
 * table covers only c[56]=AlphaIntensity and c[58]=GlowTint. Noted so a later
 * pass does not mistake it for a hidden uniform.
 *
 * Permutation: #53 "Static/Ambient" (VP-off 007040, FP-off 006480) -- the lit,
 *   Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts). The
 *   others are TODO.
 *
 * TODO: recover the real scroll rates. #87d769dc / #2481ef75 resolve to no
 *   friendly name in this disassembler build, so they would have to come from
 *   the engine's material setup rather than the shader bundle.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed --
 *   AlphaIntensity and GlowTint are unmodelled.
 */
export const cf_uvanim_emssive_glowtint_alpha: MaterialFactory = {
  name: "cf_uvanim_emssive_glowtint_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      // U from c466 (#87d769dc), V from c465 (#2481ef75) -- both MADs are live,
      // so neither rate is 0. No literal scale exists on either MAD.
      0.05,
      0.05,
    );
  },
};
