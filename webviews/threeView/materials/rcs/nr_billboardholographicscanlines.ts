import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/nr_billboardholographicscanlines.rcsmaterial
 *
 *   tex[0] #6f469b89                    static_ad_landscape05.gtf, static_ad_landscape03.gtf, static_ad_landscape01.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf, and_line_rgb_clouds_alpha.gtf, mr_pearl_spec.gtf   -> specularMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf, and_verticalemissive.gtf, dc_gradient_noise.gtf   -> map
 *   tex[4] #4f2aef81                    (no file)   -> map
 *   tex[5] #088b2c6a                    (no file)   -> map
 *   tex[6] #ef6e4697                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated, despite the name. The fragment programs declare the engine's
 * `time` uniform but never consume it — it is a dead uniform in every
 * permutation that declares it. In 00001190 <FRAGMENT crc=0739864b> (perm idx 2,
 * Static/Ambient, no shadow/spot) the declaration is there:
 *
 *     0011c0+0030:   #906b67ba  U  time  c[100]  02010001
 *     0011f4+0064:   0000                        #906b67ba  R  time  c[0]
 *
 * but the body is a plain texture blend, and every constant-slot operand that
 * could have carried it disassembles as a genuine literal zero instead:
 *
 *     MOVR R1.xyzw, f[TEX3]
 *     MOVR R0.x, {0(0), 0(0), ?, ?}.x
 *     MADR R0.w, R0.x, {0(0), 0(0), 0(0), 0(0)}.x, R1
 *     TEXR H4.xyz, f[TEX4], TEX0
 *     MULR R0.x, R0, {0(0), 0(0), 0(0), 0(0)}.x
 *     MULR R1.zw, R0, {0(0), 0(0), 0(0), 0(0)}.x
 *     TEXR R0.yz, f[TEX3], TEX1
 *     TEXR H3.xyz, R1.zwzz, TEX2
 *     TEXR H5.xyz, R2.zwzz, TEX1
 *     MULR H0.xyz, H4, H5   ; END
 *
 * The same pattern repeats in 0015e0 <FRAGMENT crc=11fd62ae> and 001b20
 * <FRAGMENT crc=4feb6897> — all three declare `time` and none reference it by
 * name in any instruction operand. The zone-tinted permutations (idx 7-14) do
 * not declare `time` at all, and no VERTEX program in this material declares it.
 *
 * That the name is absent is meaningful: the disassembler does print patched
 * uniforms inline at real use-sites, e.g. in lambert_spec_mult_scroll:
 *
 *     001990+0100:   MOVR R0.w, {constantAmbientColour, time, 0(0), 0(0)}.x
 *
 * So this factory deliberately does NOT extend ScrollingMaterial. An earlier
 * revision claimed the shader "offsets the sample coordinate with `time`";
 * that claim is contradicted by the disassembly above and has been removed.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const nr_billboardholographicscanlines: MaterialFactory = {
  name: "nr_billboardholographicscanlines.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
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
