import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/scroller_glow_v3.rcsmaterial
 *
 *   tex[0] #7ae5e199                    scroller_glow_b_alpha.gtf, scroller_glow_o_alpha.gtf   -> map
 *   tex[1] #0281588c                    dc_scroll_hex_alpha.gtf, scroller_hex_b_alpha.gtf, scroller_hex_o_alpha.gtf   -> map
 *   tex[2] #173fbce2                    scroller_multiply.gtf, scroller_multiply_01.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[4] #e1d9e1e0                    (no file)   -> map
 *   tex[5] #ade9493a                    (no file)   -> map
 *   tex[6] #87d769dc                    (no file)   -> map
 *   tex[7] #46def239                    (no file)   -> map
 *   tex[8] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. Every fragment permutation in this file
 * declares `time` (#906b67ba) in its uniform table, but none of them reads it:
 *
 *   idx=2 "Ambient"  (FP @0x1cf0)
 *     001d38+0048:  #906b67ba  U  time    c[140]  02010001
 *     001e10+0120:  MULR R0.y, R0.w, {?, time, ?, ?}.x
 *
 *   idx=3 lit, no-shadow, no-spot  (FP @0x2130)
 *     00219c+006c:  #906b67ba  U  time    c[182]  02010001
 *     0021e6+00b6:  #906b67ba  R  time    c[0]
 *     (declared and remapped only -- the string `time` appears in no MOVR /
 *      MULR / MADR / TEXR operand anywhere in this block)
 *
 *   idx=4 shadow/lightmap variant  (FP @0x2770)
 *     0028f0+0180:  MOVR R2.w, {?, constantAmbientColour, ?, time}.x
 *
 * In both instructions where `time` is printed at all the swizzle is `.x`,
 * which per fp_print_const / fp_print_swz selects word[0] of that
 * instruction's own inlined constant block -- and `time` sits at word[1]
 * (idx=2) or word[3] (idx=4), never word[0]. The word actually consumed is
 * the one printed `?`: a patched uniform whose hash is not in the database.
 * So the textual proximity of `time` inside the `{...}` group is not
 * consumption. No TEXR in any permutation takes a coordinate derived from it,
 * and no VERTEX block in the file references #906b67ba at all.
 *
 * A previous revision of this factory used ScrollingMaterial and claimed the
 * shader offsets its sample coordinate by `time`. That claim is contradicted
 * by the disassembly above and has been removed.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const scroller_glow_v3: MaterialFactory = {
  name: "scroller_glow_v3.rcsmaterial",
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
