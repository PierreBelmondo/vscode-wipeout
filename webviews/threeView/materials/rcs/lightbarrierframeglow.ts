import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/lightbarrierframeglow.rcsmaterial
 *
 *   tex[0] #62d17f19                    lightbarrier_glow.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #69d42acc                    (no file)   -> map
 *   tex[3] Colour                       (no file)   -> unused
 *   tex[4] #31182e0d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated. `time` and `Speed` are declared in the uniform tables and have
 * patch-site entries (perm 11: `time` -> c[1], `Speed` -> c[0]), but no
 * reaching instruction consumes either of them.
 *
 * In permutation 11 (Static, FP @0x003650 -- the richest binding set with no
 * Shadow/Spot, i.e. the one this factory implements) `time` appears in exactly
 * one instruction, and that write is dead:
 *
 *     003850+0200: MOVH H9.xyz, {time, zoneColourTint, 0, 0}
 *     003ab0+0460: MOVH H9.xyz, {0, 0, 0, 0}      ; H9 fully overwritten...
 *     003c30+05e0: MADR H4.xyz, H9, R2.w, R2      ; ...before its first read
 *
 * The UV path multiplies by genuine zeros rather than by time:
 *
 *     0037e0+0190: MOVR R0.xy, f[TEX4]
 *     0037f0+01a0: MADR R2.xy, -R0, {0,0,0,0}.xyxx, {0,0,0,0}.xyxx
 *     003930+02e0: MADR R2.z, R1.w, {0,0,0,0}.x, R0.x
 *     003950+0300: TEXR H0.x, R2.zwzz, TEX0
 *
 * Those zero words are real zeros, not unresolved pre-patch time slots.
 * Patch-site resolution demonstrably works in this program: it prints `time`
 * and `zoneColourTint` by name at 003850, and `Colour`/`Speed` at 0013f0.
 *
 * The only other file-wide `time` instruction is in perms 12/14 (shadow /
 * lightmap variants, out of scope) and selects `.w`, a literal zero -- `time`
 * sits at `.x` and is not selected:
 *
 *     0041a0+0210: MULH H4.xyz, H2, {time, zoneColourTint, 0, 0}.w
 *
 * Simpler permutations never read `time` by name either; perm 2 (FP @0x001340)
 * takes the `.x` of {0, 0, Colour, Speed}, so again a real zero:
 *
 *     0013f0+00b0: MOVR R0.x, {0, 0, Colour, Speed}.x
 *     001410+00d0: MADR R0.z, R0.x, {0,0,0,0}.x, R0
 *     001430+00f0: TEXR H4.xyz, R0.zwzz, TEX0
 *
 * So the glow is static, driven by Colour/Brightness/zone uniforms. This file
 * previously extended PulsingMaterial; nothing in the disassembly supports a
 * time-driven pulse, so it is a plain Phong material again.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const lightbarrierframeglow: MaterialFactory = {
  name: "lightbarrierframeglow.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, _unused3, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
