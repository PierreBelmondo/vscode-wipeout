import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/mt_uvanim_diffuse_emissive2.rcsmaterial
 *
 *   tex[0] DiffuseTexture  under_strut.gtf        -> map
 *   tex[1] ?               under_strut_glow.gtf   -> emissiveMap
 *   tex[2] lightmap                               -> lightMap
 *   GlowTint               (1.0, 0.732, 0.172) constant
 *
 * Despite the "uvanim" in the name, nothing in this material's fragment
 * program animates. The uniform table of the permutation implemented here
 * (Static backend, Ambient, no shadow, no spot -- FP @001690) does declare the
 * engine clock:
 *
 *     #906b67ba U time c[106] ... R time c[1]
 *
 * but no instruction in that program ever names it. Every constant operand
 * that could have carried it prints as a genuine raw literal:
 *
 *     001770+00e0: ADDR R0.z, R2.y, {0x00000000(0), ...}.x
 *     001790+0100: MADR R0.w, R0.z, {0x00000000(0), ...}.x, R0
 *
 * These are literal zeros rather than a misprinted uniform: `time` does print
 * by name elsewhere in the same dump when it really is read. The RigidBody
 * twin (FP @0019f0) shows the identical pattern.
 *
 * The only place in the whole disassembly where `time` appears as an
 * instruction operand is the shadow/lightmap permutation (FP @001f70, which
 * binds directionalLight0ShadowTex/LightmapTex -- not the permutation this
 * project implements), and even there it is dead:
 *
 *     0020c0+0150: MOVR R1.w, {time, GlowTint, 0, 0}.x
 *     002250+02e0: MULR R1.w, R2, {0, 0, 0, 0x3fb8aa3a(1.44269)}   ; clobbered
 *     002290+0320: MOVR R1.w, R1
 *
 * No TEXR in any permutation takes a coordinate that traces back to `time`, so
 * this is a plain static material -- no ScrollingMaterial, no PulsingMaterial.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const mt_uvanim_diffuse_emissive2: MaterialFactory = {
  name: "mt_uvanim_diffuse_emissive2.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, glow, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(glow ? { emissiveMap: glow } : {}),
      emissive: new THREE.Color(0xffbb2b),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
