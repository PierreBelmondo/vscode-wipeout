import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/mr_uvanim_em_alpha.rcsmaterial
 *
 *   tex[0] Texture1                     als_arrows_of_doom2_glow.gtf, als_arrows_of_doom_blend_glow.gtf, mar_holohgrams.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #87d769dc                    (no file)   -> map
 *   tex[3] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * tex[2] and tex[3] are not textures. #87d769dc and #2481ef75 are read by the
 * vertex program as scalar constants -- the two per-axis UV-anim speeds below
 * -- and the channel table lists them only because they are unresolved in this
 * material's uniform dictionary. The fragment program samples exactly one map.
 *
 * Permutation: idx 53 (Static/Ambient), the lit, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO. VP block @0x0067e0,
 *   FP block @0x005d50.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the scroll is done in the vertex program, not the fragment
 * program. `time` (c466, hash #906b67ba) is moved into R1.x and then used as
 * the multiplicand of one MAD per axis, each against its own speed constant:
 *
 *     MOV R1.x, c466.xxxx                          ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy   ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c467.xxxx, v1.xxxx   ; U' = time * rateU + U
 *
 * and the fragment program is a single plain lookup at that already-animated
 * coordinate, with no further per-pixel use of `time`:
 *
 *     TEXR H0.xyzw, f[TEX0], TEX0   ; END
 *
 * So both axes scroll -- unlike the V-only default in _animated.ts -- and
 * despite the material's name there is no emissive pulse in this permutation.
 *
 * c465.x (hash #2481ef75) is the V-axis speed and c467.x (hash #87d769dc) is
 * the U-axis speed. Both are genuine uniform reads rather than literals, so no
 * shader constant is folded into the rates below and the true speeds are not
 * recoverable from the SHO -- only that both axes move. The 0.05 pair matches
 * the sibling uvanim factories (see cf_uvanim_emssive.ts).
 *
 * Permutation idx 52 (ZAlphaOnly) shares this exact vertex program, so the
 * two-axis scroll is the baseline for every non-quake, non-shadow permutation
 * built on this VP/FP pair.
 */
export const mr_uvanim_em_alpha: MaterialFactory = {
  name: "mr_uvanim_em_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.05,
    );
  },
};
