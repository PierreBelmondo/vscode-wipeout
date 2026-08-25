import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/pipefx_v2.rcsmaterial
 *
 *   tex[0] #7ae5e199                    pipefx_02_firey.gtf, dc_ag_gradanim.gtf, pipefx_03_firey.gtf   -> map
 *   tex[1] #0281588c                    pipefx_01_firey_alpha.gtf, j_dome_glass.gtf, pipefx_02_firey_alpha.gtf   -> map
 *   tex[2] #173fbce2                    pipefx_01_mult.gtf, banner_05.gtf, pipefx_01_mult_02.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track_section3_03-lmap.gtf, ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf   -> lightMap
 *   tex[4] #e1d9e1e0                    (no file)   -> map
 *   tex[5] #ade9493a                    (no file)   -> map
 *   tex[6] #87d769dc                    (no file)   -> map
 *   tex[7] #46def239                    (no file)   -> map
 *   tex[8] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * Not animated. `time` is *declared* by this permutation but never *read*, so
 * this material is deliberately a plain Phong and not one of the classes in
 * _animated.ts. The evidence, permutation by permutation:
 *
 *   idx 2 (Static, "Ambient", FP @0x001cf0) binds the clock in its uniform
 *   table:
 *
 *       001d38+0048:  #906b67ba  U  time  c[140]  02010001
 *
 *   and the whole disassembly contains exactly two instructions whose printed
 *   constant group mentions that name:
 *
 *       001e10+0120:  MULR R0.y, R0.w, {?, time, ?, ?}.x
 *       0056b0+01b0:  MADR R1.z, R3.w, {?, 0x00000000(0), time, ?}.x, R1.x
 *
 *   Both swizzle `.x`, which per fp_print_const/fp_print_swz (rcs/format/sho/fp.c)
 *   selects the FIRST word of the printed four-word group. `time` sits at word 2
 *   and word 3 respectively, so neither instruction reads it -- each reads the
 *   neighbouring unresolved `?` uniform in the same block. The name only appears
 *   in the text because the printer labels the whole group.
 *
 *   idx 3 (Static, the richest binding set -- directionalLight0Direction/Colour,
 *   fogColour, constantAmbientColour and `time`, FP @0x002120, no shadow, no
 *   spot) declares `time` at 00218c+006c, but its code block 0x002250..0x002590
 *   contains no textual occurrence of `time` at all.
 *
 * An earlier revision of this file claimed the shader "modulates the emissive
 * term with time, so the glow pulses" and wrapped the result in
 * PulsingMaterial. That claim came from the two `.x`-swizzled lines above and
 * does not survive reading the swizzle index; it has been removed.
 *
 * TODO: identify the `?` uniforms adjacent to `time` (c[132], c[192]) that the
 *   two MULR/MADR above actually read. They are unnamed hashes here, not
 *   literal zero, and could still be an animation value -- but nothing in this
 *   material proves it. They would need to be resolved against the hash tables
 *   elsewhere in the codebase.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const pipefx_v2: MaterialFactory = {
  name: "pipefx_v2.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6, map7] = textures;
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
      ...(map7 ? { map: map7 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
