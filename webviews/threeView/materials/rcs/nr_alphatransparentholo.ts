import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/nr_alphatransparentholo.rcsmaterial
 *
 *   tex[0] #87245dca                    lcd_cells.gtf   -> map
 *   tex[1] diffuseTexture               billboardx.gtf   -> map
 *   tex[2] #71f9c122                    lightningbar.gtf   -> map
 *   tex[3] #98aa9bd4                    smoke.gtf   -> map
 *   tex[4] lightmap                     (no file)   -> lightMap
 *   tex[5] #ce576a6e                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated. `time` is declared in this material's uniform table and bound,
 * but the implemented permutation never reads it. Permutation 2 (RigidBody /
 * Ambient, no shadow, no spot; VP 0x001250, FP 0x001420) declares it:
 *
 *     001438+0018:  #906b67ba  U  time   c[80]  02010001
 *     001470+0050:  0001                #906b67ba  R  time   c[1]
 *
 * and the fragment program does have a UV-scroll slot wired up, but the value
 * fed into it is a literal zero, not the uniform:
 *
 *     0014b0+0090:  MOVR R0.x, {0(0), 0(0), 0(0), 0(0)}.x
 *     0014d0+00b0:  MOVR R1.zw, f[TEX3].xxxy
 *     0014e0+00c0:  MADR R1.xy, R0.x, {0.5, 0, 0, 0}.x, R1.zwzz   ; offset * 0.5 + UV
 *     001500+00e0:  TEXR R0.xz, R1, TEX2                          ; distortion sample
 *     001510+00f0:  MULR R2.xy, R1.zwzz, R0.xzxx
 *     001560+0140:  TEXR R1.x, R2, TEX2
 *
 * so the MADR adds `0.0 * 0.5` to both u and v: a no-op. Perm 2's constant at
 * fp-code offset 0x10 is all-zero in the file and is covered by no patch site,
 * so R0.x is genuinely 0.0 (its preamble does list two patch offsets, 0x20 and
 * 0x24, but they land on the words of the `MOVR R1.zw` instruction itself and
 * cover no constant word — a stale/dangling patch table).
 *
 * The permutations where the disassembler does resolve the constant by name
 * confirm the same read is not `time`. In perm 5 (FP 0x002440) the vector
 * prints as {0, fogColour, time, ?} — `time` sits in component z — while the
 * source swizzle is `.x`, selecting component 0:
 *
 *     002500+00c0:  MOVR R0.x, {0(0), fogColour, time, ?}.x
 *     002520+00e0:  MADR R0.xy, R0.x, {0.5, 0, 0, 0}.x, R0.zwzz
 *
 * No instruction in any of the 15 permutations selects the component holding
 * `time`, so nothing time-derived reaches a sample coordinate. A previous
 * version of this factory claimed the shader "modulates the emissive term"
 * with `time` and used PulsingMaterial; there is no emissive or colour
 * modulation by time anywhere in the disassembly, so that was wrong and the
 * material is now plainly static.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const nr_alphatransparentholo: MaterialFactory = {
  name: "nr_alphatransparentholo.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, map3, lightMap, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
