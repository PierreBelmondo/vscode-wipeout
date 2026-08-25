import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/nr_splitrgbscreen.rcsmaterial
 *
 *   tex[0] DiffuseTexture               tigron_slum.gtf, piranha_red_glow.gtf   -> map
 *   tex[1] #97b6f446                    animgradient_wibble.gtf   -> map
 *   tex[2] #57ff03d1                    animgradient_wibble.gtf   -> map
 *   tex[3] #87245dca                    verticaltubes.gtf   -> map
 *   tex[4] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite declaring `time`. This was previously built as a
 * ScrollingMaterial on the claim that the shader offsets the sample coordinate
 * with `time`; the disassembly does not support that. In the implemented
 * permutation (Idx 2, Backend=Static, "Ambient", FP @ 0x001090 -- the plainest
 * lit permutation, no shadow and no spot textures) `time` (#906b67ba) is
 * declared as a uniform but never read by an instruction:
 *
 *     0010a8+0018:  #906b67ba  U  time   c[68]  02010001   ; declared
 *     0010d4+0044:  0000                #906b67ba  R  time   c[0]
 *     -- fp code --
 *     MOVR R0.zw, f[TEX3].xxxy
 *     ADDR R0.x, R0.w, {0(0), 0, 0, 0}.x        ; a real literal zero
 *     TEXR R0.x, R0, TEX2
 *     MADR R1.x, R0, {0x3ebdf3b6(0.371), 0, 0, 0}.x, R0.w
 *     TEXR R0.x, R1, TEX1
 *     TEXR H0.xyz, R1.zwzz, TEX0
 *
 * That lone ADD into the sample coordinate adds a genuine literal 0, not a
 * disguised `time`: the disassembler resolves uniform names inline elsewhere in
 * this very file (it prints `fogColour`, `time`, `zoneEffectInner`), so the
 * absence of a name in this block is a real absence rather than a tool limit.
 *
 * The other permutations (3, 4, 5, 6) do resolve `time` inline, but it lands in
 * the y-slot of the constant vector and every consuming instruction swizzles
 * .x, which selects fogColour instead:
 *
 *     001500+00a0:  ADDR R0.x, R0.w, {fogColour, time, 0, 0}.x
 *     001e30+00a0:  MOVR R0.w,       {fogColour, time, 0, 0}.x
 *
 * The patch table confirms the packing: fogColour is c[80] 02040001 (4
 * components, occupying all four words) while time is c[82] 02010001 (1
 * component). All four time-bearing instructions in the file were grepped for a
 * .y/.yyyy swizzle that would actually select time's word; none exists. `time`
 * is therefore dead in every permutation of this material, not just perm 2.
 *
 * The three TEX3 samples at R2.xwzw / R2 / R1.zwzz with slightly different
 * fixed offsets (0.0, 0.371, and 0.1 / 2.0 elsewhere) are the static per-channel
 * RGB split the material is named for, not animation: the UV source is the
 * interpolated attribute f[TEX3] plus literals, and no uniform reaches any
 * texture coordinate.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *   The per-channel RGB split itself is not reproduced here.
 */
export const nr_splitrgbscreen: MaterialFactory = {
  name: "nr_splitrgbscreen.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, map3, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
