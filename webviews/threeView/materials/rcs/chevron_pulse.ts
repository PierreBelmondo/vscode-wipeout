import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials/chevron_pulse.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_floorleadin_sc.gtf   -> map
 *   tex[1] #1202d8df                    ds_floorleadin_emask.gtf   -> emissiveMap
 *   tex[2] Normal                       ds_floorleadin_n.gtf   -> normalMap
 *   tex[3] Wave                         ds_wave_c.gtf   -> unused
 *   tex[4] lightmap                     ile_mesh_combine-lmap.gtf, ile_mesh_combine1-lmap.gtf, ile_mesh_combine2-lmap.gtf   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #220cf0e6                    (no file)   -> unused
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: `time` modulates the output colour, not any texture coordinate.
 * Permutation idx 7 (Backend=Static, FRAGMENT block at file offset 0x005ae0,
 * code base 0x5c00) binds #1202d8df/#28e981a4/lightmap/Wave/Normal plus
 * prelitBias, Colour, directionalLight0DirectionWorldSpace, #220cf0e6,
 * directionalLight0Colour, fogColour, prelitScaleSpecular and time; no shadow
 * or spot textures. `time` reaches exactly two instructions:
 *
 *     005d80+02a0: MULR R1.w, R1, {time}        ; R1.w = f[TEX3].w * time
 *     006050+0570: MADR R2.xyz, -{time}, R0.x, {time} ; R2 = time * (1 - R0.x)
 *     0060f0+0610: MADH H0.xyz, R0.x, H1, R2 ; END    ; R2 added into the result
 *
 * The first is dead -- R1.w is squared and negated at 005df0, then clobbered at
 * 005eb0 before any read. The second survives: R2 is added straight into the
 * final colour at 0060f0. So the glow brightens and dims over time, which is
 * what PulsingMaterial approximates, though the shader's term is a linear
 * `time * (1 - R0.x)` addend rather than a sine.
 *
 * NOT a UV scroll. The one computed texture coordinate in the whole permutation
 * is driven by two static per-material constants, prelitBias and Colour:
 *
 *     005c00+0120: MOVR R1.xy, f[TEX4]
 *     005c10+0130: MOVR R1.w, 0.0
 *     005c30+0150: MADR R0.zw, R1.xxxy, {prelitBias, Colour}.x, R1.w
 *     005c50+0170: TEXR H1.xyz, R0.zwzz, TEX4
 *
 * and the other four fetches all use the raw interpolant (TEXR on f[TEX4] /
 * f[TEX4].zwzz at 005c60, 005cb0, 005d10, 006030). An earlier revision's claim
 * that the shader "modulates the emissive term" with time was right in shape but
 * imprecise; it is the output colour, and the Wave lookup does not move.
 *
 * Constant slots come from re-deriving the FP patch table by hand: rcsdump
 * (format/sho/sho.c) reads the preamble's `count` words as code byte offsets,
 * but they are head offsets to per-uniform lists `[count:u16][slot:u16 x count]`,
 * each slot a 16-byte constant-block index. rcsdump's inline uniform names in
 * this file are therefore unreliable -- its single printed `time` (0067f0, perm
 * 9) is spurious. The corrected table puts time at slots 70 and 25 here.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: PulsingMaterial modulates `emissive`, which no factory in this
 *   directory sets, so the pulse is currently inert here -- the shader's addend
 *   is an unconditional brightening of the output colour with no emissive
 *   colour to scale. Fixing that belongs in the base class, not this file.
 *
 * TODO: the patch table above was re-derived by hand against a disassembler
 *   whose own patch-site parser is still wrong, so it is worth a second look
 *   before anything further is built on it. The structural checks all pass (the
 *   head chain is exact in all 15 FP blocks, every decoded site lands on a zero
 *   constant slot, and permutation 0's lone uniform resolves to its lone zero
 *   slot), but the pulse's real rate and depth remain guesses either way.
 */
export const chevron_pulse: MaterialFactory = {
  name: "chevron_pulse.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    // tex[3] Wave, tex[5] Colour and tex[6] #220cf0e6 are unused: the first is
    // sampled at a static coordinate and the latter two have no file. Only one
    // texture may claim `map` -- an earlier revision spread map, map1 and map2
    // into that same key, so all but the last were silently discarded.
    const [map, emissiveMap, normalMap, _wave, lightMap] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
