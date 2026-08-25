import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/10_sebenco_climb/materials/jd_uvanim_emissivealphamultiply.rcsmaterial
 *
 *   tex[0] Texture1                     jd_sebenco_auricom_03_glow.gtf   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: 2 (Static / Ambient) -- the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). VP block @0x1110, FP block @0x1280.
 *   The others are TODO.
 *
 * Animated: the scroll is computed in the VERTEX program, not the fragment
 * program. `time` (hash #906b67ba) is bound as a vertex uniform in c[464]:
 *
 *     001140+0030: #2481ef75  U  ?     c[462]  02010001   ; V rate
 *     001164+0054: #87d769dc  U  ?     c[463]  02010001   ; U rate
 *     001170+0060: #906b67ba  U  time  c[464]  02010001
 *
 * and the vertex program adds it to the Uv1 attribute (v2), one MAD per axis,
 * each carrying its own per-axis rate:
 *
 *     MOV R0.w, c464.xxxx                          ; R0.w = time
 *     MAD o7(TEX0).w, R0.wwww, c463.xxxx, v2.xxxx  ; U' = time * rateU + Uv1.x
 *     MAD o8(TEX1).w, R0.wwww, c462.xxxx, v2.yyyy  ; V' = time * rateV + Uv1.y
 *
 * The fragment program reassembles those two scalar varyings into one
 * coordinate and takes a single sample of Texture1:
 *
 *     MOVR R0.y, f[TEX1].w                         ; V'
 *     MOVR R0.x, f[TEX0].w                         ; U'
 *     TEXR H0.xyzw, R0, TEX0                       ; Texture1 (t[0]) at (U', V')
 *     MULH H1.xyz, H0, H0.w                        ; rgb * a
 *     MADH H0.xyz, H0, {0, 0, 0, 0}, H1  ; END     ; -> H0.rgb = H1
 *
 * so BOTH axes scroll, hence rateU and rateV are both non-zero below.
 *
 * No literal scale is folded into the rates: the two MADs multiply `time` by
 * c463.x / c462.x, which are declared per-material uniform reads (category U,
 * size 1) that the runtime patches from the material -- real values, just not
 * ones this dump resolves to a name. The rates below are therefore a plausible
 * drift, not a transcription.
 *
 * The trailing `MADH H0.xyz, H0, {0,0,0,0}, H1` is a genuine hardcoded zero and
 * not a misread `time` operand. This permutation's FP declares uc=1 with a
 * single relocation (`#81db67ea R constantAmbientColour c[0]`), so no other
 * constant slot exists to patch; and the disassembler demonstrably does resolve
 * uniform names inline elsewhere in this same file (e.g. `DP3R R1.w, R1,
 * {fogColour, constantAmbientColour, 0, 0}`). The MADH therefore collapses to
 * `H0.rgb = H0.rgb * H0.a` -- the "emissivealphamultiply" premultiply, which is
 * a colour operation and not a second time term.
 *
 * Only one texture is sampled. This permutation binds just
 * `F #3bdc0403 Texture1 t[0]` and issues exactly one TEXR: there is no lightmap
 * sample and no second or third channel. An earlier revision of this factory
 * assigned four textures (map/lightMap/map1/map2, with `map` overwritten twice)
 * on the strength of the material's texture table rather than the shader body;
 * that has been reverted.
 *
 * TODO: this factory maps the material's texture channel onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: resolve #87d769dc / #2481ef75 to friendly names via scripts/hashes.ts
 *   (candidates: scrollSpeedU / scrollSpeedV, uvScrollSpeed, uvVelocity) to
 *   recover the intended speeds.
 *
 * TODO: `time` is bound as a FRAGMENT uniform in permutations 7-14, but those
 *   are the zone/shadow variants outside the point of the matrix this project
 *   implements. Constant slots must be read per permutation -- c464 is
 *   `zoneOrigin`, not `time`, in permutations 11-14.
 */
export const jd_uvanim_emissivealphamultiply: MaterialFactory = {
  name: "jd_uvanim_emissivealphamultiply.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.05,
      0.05,
    );
  },
};
