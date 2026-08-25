import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/10_sebenco_climb/materials/cf_laserrail.rcsmaterial
 *
 *   tex[0] Texture1                     cf_sebenco_railing_03_glow.gtf   -> map
 *   tex[1] Texture2                     cf_laserrail1.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #87d769dc                    (no file)   -> map
 *   tex[4] #2481ef75                    (no file)   -> map
 *   tex[5] #88be01c9                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: permutation idx=2 "Ambient" (Backend=Static, no shadow/spot), VP at
 * file offset 001170, FP at file offset 001300.
 *
 *   VP uniform table:
 *     0011a0+0030: #2481ef75  U  ?             c[462]  02010001
 *     0011c4+0054: #87d769dc  U  ?             c[463]  02010001
 *     0011d0+0060: #88be01c9  U  ?             c[461]  02010001
 *     0011dc+006c: #906b67ba  U  time          c[464]  02010001
 *
 *   VP code:
 *     001230+00c0: MUL o10(TEX3).x, v2.xxxx, c461.xxxx
 *     001240+00d0: MOV R0.w, c464.xxxx
 *     001260+00f0: MOV R1.x, c464.xxxx
 *     001270+0100: MAD o10(TEX3).z, R1.xxxx, c462.xxxx, v2.yyyy
 *     001290+0120: MAD o10(TEX3).y, R1.xxxx, c463.xxxx, v2.xxxx
 *
 *   FP code:
 *     001350+0050: MOVR R0.z, f[TEX3].x
 *     001360+0060: TEXR H0.xyzw, f[TEX3].yzxx, TEX0
 *     001370+0070: MOVR R0.w, f[TEX2]
 *     001380+0080: TEXR H1.xyzw, R0.zwzz, TEX1
 *     001390+0090: ADDH H0.xyzw, H0, H1  ; END
 *
 * R1.x is loaded from c464 (time) right before both MADs, so both TEX3.y (u)
 * and TEX3.z (v) are time*scale+uv, and only .y/.z of TEX3 feed the Texture1
 * sample (the .yzxx swizzle) -- i.e. Texture1 scrolls on both axes. TEX3.x
 * (uv1.x * c461, no time) is unused by any TEXR in this permutation. Texture2
 * is sampled with R0.zwzz = (TEX3.x [static], TEX2.?, ...) -- its UV does not
 * involve time here, so only Texture1 scrolls.
 *
 * The per-axis scale uniforms (c461/c462/c463) are genuine patched uniforms
 * (hash-declared in the U table, not raw literals) but their names didn't
 * resolve, so the real per-axis rates cannot be read back from the SHO -- see
 * ScrollingMaterial's own TODO. There is no literal shader constant here (no
 * "3.0"-style multiplier as in ShieldMaterial), so no separate scale constant
 * is introduced; both axes use ScrollingMaterial's rate parameters directly.
 */
export const cf_laserrail: MaterialFactory = {
  name: "cf_laserrail.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.05,
    );
  },
};
