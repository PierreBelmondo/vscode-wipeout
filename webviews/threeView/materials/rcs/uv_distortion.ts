import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uv_distortion.rcsmaterial
 *
 *   tex[0] Texture1                     mr_line_rgb_clouds_alpha.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #d0989794                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * NOT animated here, despite the name. `time` (#906b67ba) and `Distortion`
 * (#d0989794) are declared and patchable in this material's constant table, but
 * the implemented permutation's fragment program never consumes either as an
 * instruction operand. Permutation idx 2 "Ambient" (FP 0x1030) in full:
 *
 *     ADDR R1.zw, f[TEX3].xxxy, {0(0), 0, 0, 0}.x   ; UV + 0
 *     TEXR R0.w,  f[TEX3], TEX0                     ; sample the distortion map
 *     MADR R0.xy, R0.w, {0(0), ...}.x, R1.zwzz      ; offset scaled by 0
 *     TEXR H0.xyz, R0, TEX0                         ; resample at the offset UV
 *     MOVH H0.w,  {1.0, 0, 0, 0}.x                  ; END
 *
 * The shape is a real offset-and-resample distortion, but every constant it
 * multiplies by is a literal 0.0, so the second lookup lands on the same
 * coordinate as the first and the result is static. The two other programs that
 * declare `time` (0x12b0, 0x1650) are the same. Grepping `time` across all nine
 * fragment programs finds it only in uniform-declaration and patch-table lines,
 * never inside an instruction.
 *
 * The previous version of this factory used PulsingMaterial and claimed `time`
 * modulated the emissive term. There is no emissive multiply against `time`
 * anywhere in this shader; that claim was wrong and has been removed.
 *
 * TODO: confirm the zeros are really zeros. The disassembler does resolve names
 *   correctly elsewhere in this same dump when an instruction genuinely reads a
 *   uniform (permutation idx 6, FP 0x17e0, prints
 *   `DP3R R1.w, R1, {fogColour, constantAmbientColour, 0, 0}`), which is good
 *   evidence these operands are literal zeros rather than misprinted uniform
 *   reads. But it does not rule out the runtime writing `time`/`Distortion`
 *   into those c[0]/c[1] slots per frame, with the static disassembly showing
 *   only the unpatched constant. If this surface should visibly ripple in game,
 *   that is the thing to check next -- and the rate would then come from the
 *   engine's material setup, not the shader bundle.
 */
export const uv_distortion: MaterialFactory = {
  name: "uv_distortion.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
