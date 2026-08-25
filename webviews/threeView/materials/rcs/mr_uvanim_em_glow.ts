import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials/mr_uvanim_em_glow.rcsmaterial
 *
 *   tex[0] Texture1                     and_powerstreak2_glow.gtf, and_pipe5_glow.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #7611a2d8                    (no file)   -> map
 *   tex[3] #87d769dc                    (no file)   -> map
 *   tex[4] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * tex[3] and tex[4] are not textures. #87d769dc and #2481ef75 are read by the
 * vertex program as scalar constants -- the two per-axis UV-anim speeds below
 * -- and the channel table lists them only because they are unresolved in this
 * material's uniform dictionary. The same pair appears in the sibling
 * mr_uvanim_em_alpha.ts, which has the identical vertex program.
 *
 * Permutation: idx 53 (Static/Ambient), the lit, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO. VP block @0x006bc0
 *   (crc 53b18909), FP block @0x006050 (crc cc599735).
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the scroll is done in the vertex program, not the fragment
 * program. `time` (hash #906b67ba, bound here to c[467]) is moved into R1.x and
 * then used as the multiplicand of one MAD per axis, each against its own speed
 * constant:
 *
 *     MOV R1.x, c467.xxxx                          ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy  ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c466.xxxx, v1.xxxx  ; U' = time * rateU + U
 *
 * and the fragment program is a single plain lookup at that already-animated
 * coordinate, with no further per-pixel use of `time`:
 *
 *     TEXR H0.xyz, f[TEX0], TEX0   ; END
 *
 * So BOTH axes scroll, not V alone as the default in _animated.ts assumes.
 *
 * Despite the material's name there is no emissive animation in this
 * permutation: the FP has exactly one TEXR, so only `map` is sampled at the
 * scrolled coordinate. The one other write, `MOVH H0.w, {0,0,0,Constant1}.x`,
 * is a literal-only move with no dependency on `time`. Whatever glow the name
 * refers to comes from texture layering elsewhere, not from a second lookup
 * here -- so no emissiveMap is wired to the scroll.
 *
 * c465.x (hash #2481ef75) is the V-axis speed and c466.x (hash #87d769dc) is
 * the U-axis speed. Both print with real register bindings (uc flags 02010001)
 * rather than as raw literals, so they are genuine per-material uniforms: no
 * shader constant is folded into the rates below, and the true speeds are not
 * recoverable from the SHO -- only that both axes move. The 0.05 pair matches
 * the sibling uvanim factories (see mr_uvanim_em_alpha.ts, cf_uvanim_emssive.ts).
 */
export const mr_uvanim_em_glow: MaterialFactory = {
  name: "mr_uvanim_em_glow.rcsmaterial",
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
      0.05,
      0.05,
    );
  },
};
