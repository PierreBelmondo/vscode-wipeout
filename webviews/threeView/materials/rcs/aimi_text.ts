import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/aimi_text.rcsmaterial
 *
 *   tex[0] #fd669142                    aimi_text.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #464ac094                    (no file)   -> map
 *   tex[3] #549310b8                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: 2 -- the Ambient, Static backend, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). VP block @0x001010, FP block @0x0011b0.
 *   The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the *vertex* program scrolls the texcoord on U only, from `time`
 * (c[464], hash #906b67ba, resolved by name in permutation 2's uniform table):
 *
 *     MOV R0.w, c463.xxxx                           ; R0.w = the scroll rate
 *     MAD o10(TEX3).x, R0.wwww, c464.xxxx, v2.xxxx  ; U' = rate * time + Uv1.x
 *     MOV o10(TEX3).y, v2.yyyy                      ; V  = Uv1.y, untouched
 *
 * and the fragment program's only texture sample reads that varying:
 *
 *     TEXR H0.xyzw, f[TEX3], TEX0                   ; aimi_text.gtf (t[0])
 *
 * so the base colour map slides horizontally. TEX3.y is a plain MOV of Uv1.y,
 * so V never moves -- hence rateV = 0 below.
 *
 * c463.x (hash #549310b8, name unresolved) is the per-material scroll rate. It
 * is a declared uniform read (category U, size 1), not a literal, so there is
 * no shader constant to fold into the rate below and the true speed is not
 * recoverable from the SHO -- only that U alone scrolls.
 *
 * Corrects an earlier comment here that claimed this material modulates an
 * emissive term and pulses: permutation 2 has no emissive term at all, and
 * `time` is read only in the vertex stage, as the UV addend above.
 *
 * TODO: the FP's only post-sample op is `MULH H0.xyz, H0, {0, 0, 0, 0}` -- a
 *   genuine all-lanes literal zero, not a misresolved uniform -- followed by
 *   `MOVH H0.w, H0` before END, which zeroes RGB and keeps only alpha. That is
 *   unrelated to `time` and is not reproduced here; it wants a human look.
 *
 * TODO: permutations 7-14 (zone/lightmap variants) declare `time` in their
 *   fragment uniform tables but never reference it by name in their FP
 *   instruction streams (checked permutation 7 @0x001ed0), so permutation 2's
 *   vertex-stage scroll is the only traced consumer of the clock in this file.
 */
export const aimi_text: MaterialFactory = {
  name: "aimi_text.rcsmaterial",
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
      0.0,
    );
  },
};
