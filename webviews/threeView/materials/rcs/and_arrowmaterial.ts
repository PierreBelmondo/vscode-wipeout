import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/and_arrowmaterial.rcsmaterial
 *
 *   tex[0] Texture1                     arrow_da2.gtf   -> map
 *   tex[1] #28dfc658                    dc_scanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #1c96b9d6                    smoke.gtf   -> map
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #d623be3b                    (no file)   -> map
 *   tex[6] #87d769dc                    (no file)   -> map
 *   tex[7] #2481ef75                    (no file)   -> map
 *   tex[8] #fcb10350                    (no file)   -> map
 *   tex[9] #3f5a689b                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated. This material used to be built as a `PulsingMaterial` on the
 * claim that the shader modulated its emissive term with `time`; the
 * disassembly does not support that. `time` (hash #906b67ba) is declared at
 * c[0] in the fragment program's uniform table, but the permutation this
 * factory implements -- idx 2 "Ambient", Static backend, no shadow, no spot,
 * FP off=001410 crc=aecae2c9 -- never reads it. Its whole body (0014d0-001690)
 * only ever touches genuine inline zero literals:
 *
 *     0014d0+00c0: MOVR R0.zw, f[TEX4].xxxy
 *     0014e0+00d0: MOVR R0.x, {0x00000000(0), ...}.x
 *     001500+00f0: MULR R2.w, R0.x, {0x00000000(0), ...}.x
 *     001590+0180: TEXR H0.xyz, f[TEX3].zwzz, TEX0
 *     001690+0280: MULH H0.xyz, H0, {0x00000000(0), ...}   ; END
 *
 * The next-richer Static permutation (idx 3, FP off=0018c0, crc=a7fd00ca) does
 * name `time`, but multiplies it by a hardcoded zero, so it is dead code:
 *
 *     0019b0+00f0: MOVR R1.x, {0x00000000(0), ...}.x
 *     0019d0+0110: MADR R0.y, R1.x, {time, ?, 0, 0}.x, R0   ; R0.y unchanged
 *
 * The same pattern recurs verbatim at 001fb0+0110 (crc=f1cf820c). The vertex
 * programs do read `time` from c464, but every such MAD lands in an output TEX
 * channel (o10/TEX3.zw, o11/TEX4.zw) that the Ambient FP only feeds into those
 * zero-multiplies -- it is never used as a TEXR coordinate. So no permutation
 * this viewer implements has `time` reaching colour, UV or position, and a
 * plain Phong material is the honest approximation.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const and_arrowmaterial: MaterialFactory = {
  name: "and_arrowmaterial.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8] = textures;
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
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
