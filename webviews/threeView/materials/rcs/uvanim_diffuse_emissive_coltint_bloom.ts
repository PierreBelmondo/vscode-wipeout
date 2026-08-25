import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uvanim_diffuse_emissive_coltint_bloom.rcsmaterial
 *
 *   tex[0] DiffuseTexture               ad_v_long1_alpha.gtf, ad_generic_v_long1_alpha.gtf   -> map
 *   tex[1] #b1f2a176                    lunarparcs_verticaladvert.gtf, ricochet_verticaladvert.gtf, pandaface_verticaladvert.gtf   -> map
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
 * Permutation: idx 3 (VP-off 001c90, FP-off 001e20), Static -- the lit,
 *   no-shadow, no-spot point of the matrix (see _abstract.ts). The others
 *   are TODO.
 *
 * NOT animated, despite the name. `time` (#906b67ba) is declared in this
 * permutation's uniform tables and even gets a real constant-bank slot:
 *
 *     001e80+0060:  #906b67ba  U  time   c[184]  02010001
 *     001ed8+00b8:  0004       #906b67ba  R  time   c[4]
 *
 * but no instruction in either program ever reads it. The fragment body was
 * inspected in full; its UV path is a plain passthrough of TEX4:
 *
 *     MOVR R0.xy, f[TEX4]
 *     MOVR R3.z, R0.x
 *     ADDR R3.x, R0.y, {0, 0, 0, 0}.x      ; adds a genuine zero, not time
 *     MULR R1.xy, R3.zwzz, {0, 0, 0, 0}.x  ; also a genuine zero (no patch)
 *     TEXR H2.xyzw, R1, TEX1
 *     TEXR H3.xyzw, f[TEX4], TEX0
 *
 * and the matching vertex block 00001c90 <VERTEX crc=1579e1df> never mentions
 * c[4]/time at all -- pure transform plus `MOV o11(TEX4).xy, v2.xyxx`.
 *
 * Grepping every disassembled instruction in the whole material for a constant
 * group naming "time" or "speed" finds three sightings, and each one's trailing
 * swizzle picks lane .x -- never the lane actually named time/speed:
 *
 *     001b50+0130: ADDR R0.x, R0.w, {constantAmbientColour, time, ?, ?}.x
 *     001fc0+01a0: MOVR R1.w, {?, ?, GlowTint, speed}.x
 *     0025f0+01b0: ADDR R1.w, R3.y, {?, ?, GlowTint, speed}.x
 *
 * The material does contain a real `time * speed` UV scroll, but only in
 * permutation 1 (ZAlphaOnly, 00001700 <VERTEX crc=7d6eaa3b>):
 *
 *     MUL R0.z, R0.zzzz, c462.xxxx           ; c462 = time (direct, unambiguous)
 *     MAD R0.y, R0.yyyy, c465.xxxx, R0.zzzz  ; v = uv.v * c465 + speed * time
 *     MUL o7(TEX0).xy, R0.xyxx, c463.xxxx
 *
 * That is a depth/alpha-only prepass permutation with no colour output, so it
 * is outside what these factories implement. This factory previously extended
 * ScrollingMaterial on the strength of that scroll; it does not belong to the
 * permutation rendered here and has been removed.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvanim_diffuse_emissive_coltint_bloom: MaterialFactory = {
  name: "uvanim_diffuse_emissive_coltint_bloom.rcsmaterial",
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
