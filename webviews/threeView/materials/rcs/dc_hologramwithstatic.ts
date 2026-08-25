import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/dc_hologramwithstatic.rcsmaterial
 *
 *   tex[0] #05dff912                    dc_scanlines.gtf   -> map
 *   tex[1] Texture1                     advert_a.gtf   -> map
 *   tex[2] #dba0a35a                    dc_gradient_horizontal.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #eedee991                    (no file)   -> map
 *   tex[5] #31182e0d                    (no file)   -> map
 *   tex[6] #b6573513                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated, despite the name and despite `time` being bound. The material
 * declares `Speed` and `time` as patched uniforms, but the implemented
 * permutation never reads either one. Permutation 2 (Static / Ambient, FP at
 * 0x001200) is the plainest lit point of the matrix, and its whole use of that
 * constant block is:
 *
 *     0012b0+00b0:  MOVR R1.xy, f[TEX3]                           ; interpolated UV
 *     0012c0+00c0:  MOVR R0.w, {0, 0, Speed, time}.x              ; .x -> literal 0
 *     0012f0+00f0:  MADR R1.z, R0.w, {0, 0, 0, 0}.x, R1.x         ; U' = 0*0 + U
 *     001340+0140:  TEXR H0.xyz, R1.zwzz, TEX1
 *     001350+0150:  MADR R1.w, R0, {0, 0, 0, 0}.x, R1.y           ; V' = 0*0 + V
 *     001390+0190:  ADDH H0.xyz, H0, H2  ; END
 *
 * The disassembler prints a constant vector as its four slots in x,y,z,w order
 * followed by the source swizzle. `Speed` and `time` sit in slots z and w, but
 * the MOVR reads `.x` -- a genuine pre-patch literal zero (src0 = 0x00021c9c ->
 * rot16 -> 0x1c9c0002: reg_type 2 = CONSTANT, swizzle 0,0,0,0). So R0.w = 0 and
 * neither uniform is consumed. Cross-checked three ways: the FP's patch-site
 * table lists exactly four offsets (0x28/0x2c/0x30/0x34 off code start 0x12b0),
 * all landing in that one block's z/w words; the constant blocks feeding the two
 * MADRs carry no patch sites at all, so their zeros are real; and the
 * disassembler is not blanket-zeroing, since the sibling permutation at 0x1530
 * prints a true literal 0x3fb8aa3a (1.44269, log2 e). A grep for `time`/`Speed`
 * across all nine FP blocks returns exactly the one MOVR above.
 *
 * The net effect is R1.z = TEX3.x and R1.w = TEX3.y: TEX1 and TEX2 are both
 * sampled at the unmodified interpolated UV. This looks like the shader compiler
 * folding the animation path down to constants for a permutation where the
 * feature was disabled, leaving the binding slots in place. So: a plain Phong
 * material, no ScrollingMaterial.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: the seven texture spreads below all write the same `map` key, so only
 *   the last survives -- the visible channel ends up being map5 (#b6573513)
 *   rather than the Texture1 + gradient sum the shader computes. Pre-existing.
 */
export const dc_hologramwithstatic: MaterialFactory = {
  name: "dc_hologramwithstatic.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
