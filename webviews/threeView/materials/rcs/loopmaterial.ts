import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/loopmaterial.rcsmaterial
 *
 *   tex[0] #dd7ec609                    mar_aimee_holo.gtf, loopeffect_red.gtf, loopeffect.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[2] #fad8b460                    smoke.gtf   -> map
 *   tex[3] #464ac094                    (no file)   -> map
 *   tex[4] #08a111e3                    (no file)   -> map
 *   tex[5] #5895bced                    (no file)   -> map
 *   tex[6] #0942573b                    (no file)   -> map
 *   tex[7] #d09c054d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: the scroll is built in the *vertex* program, not the fragment one.
 * The VP takes `time` (c464, #906b67ba), scales it by c463 (#08a111e3) and
 * subtracts it into the y component of the TEX3 varying:
 *
 *     MOV o7(TEX0).xyz, c461.xxxx
 *     MOV R0.w, c464.xxxx                       ; time
 *     MUL R0.w, R0.wwww, c463.xxxx              ; time * scroll rate
 *     MAD o10(TEX3).y, v8.yyyy, c462.xxxx, -R0.wwww   ; V' = V * k - time * rate
 *     MOV o10(TEX3).xzw, v8.xxzw                ; .x/.z/.w straight from v8, static
 *
 * and the FP then samples with that varying:
 *
 *     MOVR R0.zw, f[TEX3]
 *     TEXR H0.xyzw, f[TEX3], TEX0   ; base colour at the scrolled (.xy) coord
 *     TEXR R0.y, R0.zwzz, TEX1      ; TEX1 at the static (.zw) pair
 *
 * So only **V** moves, and only for TEX0 -- the `map` channel. TEX1 (smoke.gtf)
 * is sampled from the untouched .zw pair and does not scroll. The rate is
 * negative in the shader (`-R0.wwww`), hence the negative rateV below.
 *
 * Permutation: idx 2 "Ambient" (Static backend, VP@0x001700, FP@0x0018c0) --
 *   the lit, Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts).
 *   The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: c463 is a genuine per-instance uniform (it has a patch-site table entry,
 *   and prints as "?" only because its name hash #08a111e3 is missing from the
 *   disassembler's known-name table), not a hardcoded literal -- so there is no
 *   shader constant to apply here. It pairs with `time` in this same MUL across
 *   every permutation in the file (idx 1-20), which is what identifies it as the
 *   scroll speed. Its actual value would have to come from the engine's material
 *   setup rather than the shader bundle; SCROLL_RATE_V below is a placeholder.
 */

/** Stands in for c463 (#08a111e3), the unresolved per-instance scroll-rate uniform. */
const SCROLL_RATE_V = 0.05;

export const loopmaterial: MaterialFactory = {
  name: "loopmaterial.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4, map5, map6] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        ...(map6 ? { map: map6 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0,
      -SCROLL_RATE_V,
    );
  },
};
