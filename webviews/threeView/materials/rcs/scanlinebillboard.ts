import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/adverts/scanlinebillboard.rcsmaterial
 *
 *   tex[0] #6f469b89                    feisar_landscape01_a.gtf, banner_02.gtf, billboard2.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf   -> map
 *   tex[4] #464ac094                    (no file)   -> map
 *   tex[5] #08a111e3                    (no file)   -> map
 *   tex[6] #5895bced                    (no file)   -> map
 *   tex[7] #0942573b                    (no file)   -> map
 *   tex[8] #d09c054d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated. `time` (#906b67ba) is declared in the fragment program's
 * uniform table of every permutation -- and only there; no VERTEX header in the
 * file declares it at all -- but no instruction ever reads it.
 *
 * The richest plain-lit permutation, idx 3 "Static, no shadow/spot"
 * (VP off=002010, FP off=0021a0), is the one that looks animated at a glance.
 * Its FP preamble patch-site table lists seven constants:
 *
 *     002254+00b4: 00 00 00 07 00 00 00 34 00 00 00 38 00 00 00 3c
 *     002264+00c4: 00 00 00 40 00 00 00 44 00 00 00 48 00 00 00 4c
 *
 * with declaration order [0]=#08a111e3 [1]=#0942573b [2]=fogColour
 * [3]=#464ac094 [4]=#5895bced [5]=time [6]=#d09c054d, so `time` is entry #5,
 * at offset 0x48. That offset falls inside the trailing constant block of
 * exactly one instruction:
 *
 *     0022d0+0130: 10040200 c8041c9d 00020000 c8000001
 *                  MULR R2.w, R1, {?, ?, time, ?}.x
 *
 * 0x48 is word-index 2 of that block, which is why the disassembler prints
 * `time` as the third item -- but the instruction's swizzle is `.x`, i.e. it
 * reads word index 0 (the unnamed uniform #08a111e3) replicated across all
 * channels. Word index 2 is never read. No other instruction in the program
 * touches that constant slot.
 *
 * The same pattern repeats verbatim in every permutation that declares `time`:
 * FP@0021a0 (idx 3/5), FP@002760 (idx 4/6, `MULR R2.w, R1, {?, ?, time, ?}.x`
 * at 002890), FP@005560 (idx 15/16, at 005690) and FP@0070f0 (idx 21/22,
 * `MULR R1.w, R0.y, {?, ?, time, ?}.x` at 007220). Every texture coordinate in
 * the file is built from `f[TEXn]` varyings and unnamed uniforms only -- no
 * term derived from `time` reaches a TEXR coordinate or any colour multiply.
 *
 * So the scanlines do not scroll here: the material previously extended
 * ScrollingMaterial on the strength of the declaration alone, which the
 * disassembly does not support.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: the shadow/spot permutations were not checked instruction by
 *   instruction; if one of them turns out to consume `time`, revisit this.
 */
export const scanlinebillboard: MaterialFactory = {
  name: "scanlinebillboard.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7] = textures;
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
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
