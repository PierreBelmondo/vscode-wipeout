import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/adverts/cf_constantcolourglow_ramp_04.rcsmaterial
 *
 *   tex[0] Colour                       feisar_landscape01_a.gtf, feisar_landscape03_flat.gtf   -> unused
 *   tex[1] #76fc220b                    gradient_aimi_01.gtf   -> map
 *   tex[2] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #1c96b9d6                    smoke.gtf   -> map
 *   tex[5] #6d0178af                    (no file)   -> map
 *   tex[6] #d5814b74                    (no file)   -> map
 *   tex[7] #bbe42ccd                    (no file)   -> map
 *   tex[8] #68d512e9                    (no file)   -> map
 *   tex[9] #8f3d0b43                    (no file)   -> map
 *   tex[10] #e0dcab49                    (no file)   -> map
 *   tex[11] #5963a112                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2 "Ambient" (Backend=Static, no shadow/spot bindings) --
 *   the lit, Ambient, no-shadow, no-spot point of the matrix (see
 *   _abstract.ts). FP block @0x001910. The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Not animated. Despite the "constantcolourglow_ramp" name -- and unlike its
 * siblings _ramp_02 and _ramp_03, which do scroll V from the *vertex* program
 * -- this permutation reads `time` and then throws it away. The FP block at
 * 0x001910 disassembles as:
 *
 *     001a80+0170: MOVR R1.w, {time, ?, ?, ?}.x          ; R1.w = time
 *     001aa0+0190: MULR R1.y, R1.w, {0(0), 0(0), 0(0), 0(0)}.x   ; R1.y = time * 0.0
 *     001ac0+01b0: TEXR R0.y, R2, TEX1
 *     001ad0+01c0: ADDR R0.w, R1.y, R0.y                 ; + 0
 *     001ae0+01d0: ADDR R3.x, R2, R1.y                   ; + 0
 *     001b20+0210: ADDR R3.y, R2, R0.w                   ; + 0
 *     001c20+0310: TEXR H4.xyz, R3, TEX1                 ; the ramp, #76fc220b
 *
 * R1.w comes from the `time` uniform (#906b67ba, bound to c[3] by the FP
 * preamble's patch table), but the MULR multiplier is a genuine all-zero
 * literal quad -- printed as a literal on every component, not as a resolved
 * uniform name, and the disassembler does print names inline where a patch
 * site is really read. So R1.y is a hard zero, and the three ADDRs that fold
 * it into the texcoord register R3 feeding the second TEX1 sample are no-ops.
 * The ramp is sampled at a static UV.
 *
 * All 12 FRAGMENT blocks in the file were checked: no other permutation
 * resolves `time` by name except through the same multiply-by-zero. Idx 3/4/5
 * (FP blocks @0x002020, @0x0028b0, @0x0031e0 -- the richer "Static, ?"
 * variants that offer fogColour instead of no-fog) declare `time` as a bound
 * uniform in their preamble tables but never reference it anywhere in their
 * instruction bodies at all.
 *
 * An earlier revision of this factory used PulsingMaterial and claimed the
 * shader "modulates the emissive term" with `time` so the glow pulses. The
 * disassembly does not support that: `time` never reaches a colour term in any
 * permutation here, only a UV that it contributes zero to. That claim was a
 * stale reading from before the disassembler's literal/uniform fix and has
 * been removed.
 *
 * TODO: only the fragment stage has been traced. Both sibling materials drive
 *   their ramp scroll from the *vertex* program, so if this one visibly moves
 *   in game, its VP block is where to look -- not the FP.
 */
export const cf_constantcolourglow_ramp_04: MaterialFactory = {
  name: "cf_constantcolourglow_ramp_04.rcsmaterial",
  minTextures: 1,
  maxTextures: 12,
  make: (textures: THREE.Texture[]) => {
    const [_unused0, map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8, map9] = textures;
    return new THREE.MeshPhongMaterial({
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
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
