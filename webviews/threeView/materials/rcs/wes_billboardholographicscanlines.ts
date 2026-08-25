import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/wes_billboardholographicscanlines.rcsmaterial
 *
 *   tex[0] #6f469b89                    exhaust_glow.gtf, exhaust_red_glow_atoc.gtf   -> map
 *   tex[1] #dd7ec609                    exhaust_glow.gtf, exhaust_red_glow_atoc.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf   -> map
 *   tex[4] #4f2aef81                    (no file)   -> map
 *   tex[5] #088b2c6a                    (no file)   -> map
 *   tex[6] #ef6e4697                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. The material declares the engine's `time`
 * uniform (hash #906b67ba) but never consumes it. Only 3 of the file's 9
 * fragment programs mention `time` at all -- 0x1330, 0x1810 and 0x1dd0 -- and
 * in those it appears solely in the uniform table and the constant-bank remap
 * table, i.e. the runtime patches c[0] with the live clock every frame and
 * nothing reads it back:
 *
 *     001360+0030:  #906b67ba  U  time  c[100]  02010001   ; declaration
 *     001394+0064:  #906b67ba  R  time  c[0]               ; remap target
 *
 * Every constant-register read the disassembler resolves inside an actual
 * instruction in these programs is a confirmed literal zero, not a time value:
 *
 *     MOVR R0.x, {0(0), 0(0), ?, ?}.x
 *     MADR R0.w, R0.x, {0(0), 0(0), 0(0), 0(0)}.x, R1
 *     MULR R0.x, R0, {0(0), 0(0), 0(0), 0(0)}.x
 *     MULR R1.zw, R0, {0(0), 0(0), 0(0), 0(0)}.x
 *     TEXR R0.yz, f[TEX3], TEX1
 *     TEXR H3.xyz, R1.zwzz, TEX2
 *     TEXR H5.xyz, R2.zwzz, TEX1
 *
 * The TEXR coordinates are built from interpolated f[TEXn] varyings and
 * R-register maths seeded from those zeros -- there is no scroll or offset term
 * derived from `time` anywhere in the fragment code. The remaining 6 programs
 * (the zone/lightmap variants) do not even declare the uniform. What the FP
 * actually computes is a static glow: TEXR against f[TEX0..4], MULH/ADDH
 * blends, and an SLTH threshold against 0.5.
 *
 * This replaces an earlier ScrollingMaterial here, whose "the shader offsets
 * the sample coordinate with `time`" comment came from a disassembler bug that
 * misread this always-zero patch site as a live time value.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const wes_billboardholographicscanlines: MaterialFactory = {
  name: "wes_billboardholographicscanlines.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
