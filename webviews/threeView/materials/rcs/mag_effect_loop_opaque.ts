import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/mag_effect_loop_opaque.rcsmaterial
 *
 *   tex[0] #1202d8df                    mag_emiss_floor_seethru_talons.gtf   -> map
 *   tex[1] #cc98c527                    dc_iridescent_gradient.gtf   -> map
 *   tex[2] Texture2                     glass_etched_tech.gtf   -> map
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> unused
 *   tex[4] lightmap                     (no file)   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #6c57ba63                    (no file)   -> map
 *   tex[7] #e93dfe2c                    (no file)   -> map
 *   tex[8] #81e0e773                    (no file)   -> map
 *   tex[9] #220cf0e6                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2 -- Static backend, "Ambient", VP-off 004b80 / FP-off
 *   004ce0, no shadow and no spot bindings: the lit, Ambient, no-shadow,
 *   no-spot point of the matrix (see _abstract.ts). The others are TODO.
 *
 * Not animated, despite declaring `time`. The permutation's uniform table does
 * bind the engine clock:
 *
 *     004d34+0054: #906b67ba  U  time   c[158]  02010001
 *
 * but `time` sits in lane z of a packed 128-bit constant word, and the only
 * instruction in this permutation's fragment code that mentions it reads a
 * different lane:
 *
 *     MOVR R0.zw, f[TEX3].xxxy
 *     MOVR R0.x,  {0, 0, 0, 0}.x
 *     MADR R0.xy, R0.zwzz, {iblScalePower, constantAmbientColour, time, ?}.x, R0.x
 *
 * The trailing `.x` selects lane 0 -- `iblScalePower` -- so this MADR scales the
 * UV by an IBL constant, not by the clock. The disassembler prints all four
 * lane names of an inline constant word regardless of which one is used (see
 * rcsdump `format/sho/fp.c`, `fp_print_const`), so a name inside `{...}` is not
 * evidence the instruction consumes it; only the swizzle after `}` is.
 * Grepping the whole FP block at 004ce0 for `time` returns exactly the two
 * uniform-table declaration lines and this one MADR, and idx 2 has no
 * vertex-side `time` entry either. Hence: no time-driven term here.
 *
 * An earlier revision of this factory used PulsingMaterial on the strength of
 * that constant-word name; that was a misreading and has been reverted.
 *
 * TODO: a different permutation (idx 7/12, unnamed, FP-off 006ae0 -- not the
 *   Static/Ambient/no-shadow/no-spot one implemented here) does read `time`
 *   by name at `MULR H4.xyz, R1.w, {?, 0, time, ?}`. If this project ever
 *   implements that variant, it is genuinely animated.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const mag_effect_loop_opaque: MaterialFactory = {
  name: "mag_effect_loop_opaque.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, _unused3, lightMap, _unused5, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
