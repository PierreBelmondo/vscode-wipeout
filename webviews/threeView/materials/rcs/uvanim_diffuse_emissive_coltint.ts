import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uvanim_diffuse_emissive_coltint.rcsmaterial
 *
 *   tex[0] DiffuseTexture               ad_v_long1_alpha.gtf, ad_mrsomo_v_long1_alpha.gtf   -> map
 *   tex[1] #b1f2a176                    blimp_verticalstrip.gtf, ad_mrsomo_v_long1.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #a9335f0c                    (no file)   -> map
 *   tex[4] #78256a45                    (no file)   -> map
 *   tex[5] #78787596                    (no file)   -> map
 *   tex[6] #e8bcd7f5                    (no file)   -> map
 *   tex[7] #f0d90109                    (no file)   -> map
 *   tex[8] #a24bc055                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated, despite the name. `time` (#906b67ba) is declared in the uniform
 * table of every lit permutation -- always at register c[4] -- but no
 * instruction ever selects it. Permutation 2 (Static "Ambient", FRAGMENT
 * @0x0011b0, no shadow/spot) is the whole fragment program:
 *
 *     MOVR R2.zw, f[TEX3].xxxy                                  ; the UV, straight off the interpolator
 *     MOVR R2.x,  {0(0), 0(0), 0(0), 0(0)}.x
 *     ADDR R0.x,  R2.w, {constantAmbientColour, time, ?, ?}.x   ; .x selects word[0] = constantAmbientColour
 *     MULR R1.w,  R0.x, {0(0), 0(0), 0(0), 0(0)}.x
 *     TEXR H0.xyzw, f[TEX3], TEX0                               ; diffuse at the *unmodified* UV
 *     MULR R2.xy, R2.zwzz, {0(0), 0(0), 0(0), 0(0)}.x
 *     TEXR H0.xyz, R2, TEX1
 *     MOVH H0.w,  {0(0), 0(0), 0(0), 0(0)}.x  ; END
 *
 * The ADDR is the only instruction that looks like it touches `time`, and it
 * does not: the four names printed inside `{...}` are the four words of the
 * 16-byte constant block trailing the instruction, and the swizzle after the
 * brace picks which one is read (format/sho/fp.c, fp_print_const). `.x` is
 * word[0], `constantAmbientColour`; `time` is word[1] and would need `.y`.
 *
 * The FRAGMENT-sharing sibling, permutation 3 (Static, directional-lit, no
 * shadow/spot, @0x0015f0), declares `time` at c[4] the same way and likewise
 * never reads it -- grepping its full 30-instruction block for `time` among the
 * operands returns nothing, and its UVs are plain MOV-throughs of f[TEX0] /
 * f[TEX4]. The vertex programs do not move the UVs either: permutation 2's VP
 * at 0x1460 declares no `time` uniform at all, only viewProj / positionScale /
 * positionBias / eyePositionWorldSpace.
 *
 * Every other unnamed constant operand above is a genuine `0x00000000(0)`
 * literal, not an unresolved patch site -- the named uniform patches
 * immediately adjacent to them resolve correctly.
 *
 * So this is a plain MeshPhongMaterial. It previously extended
 * ScrollingMaterial on the strength of the material's name; nothing in the
 * shader supports that.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO -- the 15 FRAGMENT blocks were not
 *   all disassembled, so a shadow/spot variant consuming `time` is not fully
 *   ruled out, only unlikely.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvanim_diffuse_emissive_coltint: MaterialFactory = {
  name: "uvanim_diffuse_emissive_coltint.rcsmaterial",
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
