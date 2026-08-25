import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/and_anim_spec.rcsmaterial
 *
 *   tex[0] DiffuseTexture               and_newdome_darklittlepatch.gtf   -> map
 *   tex[1] #b1f2a176                    and_lightstrip_03_e.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #5710904f                    (no file)   -> map
 *   tex[5] #78787596                    (no file)   -> map
 *   tex[6] #48ca4e3e                    (no file)   -> map
 *   tex[7] #e8bcd7f5                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts) — Backend=Static, Permutation=Ambient, fragment program
 *   at file offset 0016e0. The others are TODO.
 *
 * Not animated, despite the name. The permutation's uniform table does declare
 * the engine clock and the loader does give it a register:
 *
 *     F  #906b67ba  time                   c0000005
 *     001766+0086: 0001                    #906b67ba  R  time   c[1]
 *
 * but nothing in the block's instruction stream (0017c0–001920) reads it. Every
 * constant operand there is a raw literal zero rather than a resolved uniform:
 *
 *     MOVR R0.w, f[TEX1]                        ; V, straight through
 *     ADDR R1.y, R0.w, {0(0), ...}.x            ; + 0
 *     MADR R1.y, R1, {0(0), ...}.x, R1.x        ; * 0 + 0
 *     MOVR R2.w, f[TEX0]                        ; U, straight through
 *     ADDR R2.x, R2.w, {0(0), ...}.x            ; + 0
 *     TEXR H0.xyzw, R1.zwzz, TEX0               ; diffuse at the *unmoved* UV
 *     TEXR H1.xyz, R1, TEX1                     ; emissive, same UV
 *     MULH H1.xyz, H0.w, H1
 *     MADH H0.xyz, H0, {0(0), ...}, H1  ; END
 *
 * Those zeros are unpatched c[] slots, not disguised clock reads: the
 * disassembler prints `time` by name wherever it is genuinely consumed — e.g.
 * the richer permutation at 004e20 in the same file, which does
 * `MADR R0.xy, R0.zwzz, {iblScalePower, constantAmbientColour, time, ?}.x, R0.x`.
 * Grepping the 0016e0 block for the string `time` returns nothing. So the UV
 * offsets are identically zero and the emissive term is never modulated: a
 * declared-but-unused uniform in this permutation.
 *
 * The factory therefore uses a plain Phong material, not one of the animated
 * classes in _animated.ts. (An earlier revision extended PulsingMaterial on the
 * strength of a disassembler bug that misread the zero preamble bytes.)
 *
 * TODO: the animation may be real in one of the permutations this factory does
 *   not implement — 004e20 consumes `time` — so a permutation-aware factory
 *   would need to bring it back for those.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const and_anim_spec: MaterialFactory = {
  name: "and_anim_spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
