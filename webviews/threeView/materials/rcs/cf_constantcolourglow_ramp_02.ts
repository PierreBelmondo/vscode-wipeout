import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/cf_constantcolourglow_ramp_02.rcsmaterial
 *
 *   tex[0] #76fc220b                    gradient_firey_01.gtf, gradient_aimi_01.gtf   -> map
 *   tex[1] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #1c96b9d6                    smoke.gtf   -> map
 *   tex[4] #6d0178af                    (no file)   -> map
 *   tex[5] #d5814b74                    (no file)   -> map
 *   tex[6] #bbe42ccd                    (no file)   -> map
 *   tex[7] #68d512e9                    (no file)   -> map
 *   tex[8] #8f3d0b43                    (no file)   -> map
 *   tex[9] #e0dcab49                    (no file)   -> map
 *   tex[10] #5963a112                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2, the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO. VP block @0x0011d0, FP
 *   block @0x0013b0.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the *vertex* program scrolls the ramp's V coordinate from `time`
 * (c[463], hash #906b67ba) and hands the result to the fragment program in
 * the TEX3 varying:
 *
 *     MOV o10(TEX3).x, v2.xxxx                     ; U passes through untouched
 *     MOV R0.z, c463.xxxx                          ; R0.z = time
 *     MUL R0.xy, v2.xyxx, c462.xxxx                ; the static .zw copy of the UV
 *     MOV o10(TEX3).zw, R0.xxxy
 *     MUL R0.z, R0.zzzz, c464.xxxx                 ; time * rate
 *     MAD o10(TEX3).y, v2.yyyy, c461.xxxx, -R0.zzzz ; V' = V * k - time * rate
 *
 * and the fragment program samples the ramp at that scrolled coordinate:
 *
 *     TEXR H3.xyz, f[TEX3], TEX0                   ; TEX0 = t[0], #28dfc658
 *
 * so the colour ramp slides along V -- which is what the material's name,
 * "constantcolourglow_ramp", describes. Only this H3 sample consumes the
 * animated component; the other TEX3 reader takes the static .zw pair:
 *
 *     TEXR R1.y, f[TEX3].zwzz, TEX1                ; time-independent
 *
 * The MAD subtracts the time term, so the rate below is negative: the ramp
 * travels towards decreasing V.
 *
 * There is no literal scale on the scroll. c464.x (hash #68d512e9) is a
 * genuine per-permutation uniform read, so the true speed is not recoverable
 * from the SHO -- only the axis and its sign. The rate here is the
 * _animated.ts default drift, negated.
 *
 * Note: `time` is declared in this permutation's FP uniform table too
 * (c[132], patch slot 2), but no FP instruction ever reads it -- every literal
 * quad that could have resolved to it disassembles as a real zero, and a
 * sibling FP in the same file does print resolved uniform names inline where a
 * patch site is genuinely read. So there is no fragment-stage pulse here; an
 * earlier revision of this factory used PulsingMaterial and modulated the
 * emissive term, which the disassembly does not support.
 */
export const cf_constantcolourglow_ramp_02: MaterialFactory = {
  name: "cf_constantcolourglow_ramp_02.rcsmaterial",
  minTextures: 1,
  maxTextures: 11,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8, map9] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        ...(map6 ? { map: map6 } : {}),
        ...(map7 ? { map: map7 } : {}),
        ...(map8 ? { map: map8 } : {}),
        ...(map9 ? { map: map9 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.0,
      -0.05,
    );
  },
};
