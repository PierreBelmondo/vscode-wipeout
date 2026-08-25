import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/water_noref.rcsmaterial
 *
 * The main sea surface — 3 of the 5 water slots in 01_vineta_k.
 *
 *   tex[0] ?         waves2.gtf      wave/normal detail, sampled twice
 *   tex[1] ?         skyreflect.gtf  sky reflection
 *   tex[2] ?         waves2.gtf      second wave layer (same texture, own UVs)
 *   tex[3] lightmap  lmaps/*-lmap.gtf
 *   Colour           (0.024, 0.039, 0.043)  deep water tint
 *   Specular_Colour  (0.914, 0.914, 0.605)  sun glint
 *   Specular_Power   30
 *
 * "noref" = no planar reflection; it uses the sky texture instead. Every
 * lit permutation also binds paraboloidReflectionTex, which the viewer has no
 * equivalent for — the sky texture stands in as an environment map.
 *
 * The motion is a UV scroll built in the *vertex* program and consumed by the
 * fragment program. VP @ 0x001b30, with `time` bound as
 *
 *     001ba4+0074:  #906b67ba  U  time  c[458]  02010001
 *
 *     001c70+0140:  MOV R1.w, c457.zzzz            ; fixed preamble constant
 *     001ca0+0170:  MUL R1.w, R1.wwww, c458.xxxx   ; × time -> animation phase
 *     001cc0+0190:  MAD o11(TEX4).zw, R1.wwww, c460.xxxx, R3.xxxy   ; UV set A
 *     001cd0+01a0:  MAD o11(TEX4).xy, R1.wwww, c461.xxxx, R0.zwzz   ; UV set B
 *
 * and FP @ 0x001dc0 samples the one wave texture at both of them:
 *
 *     001e30+0070:  TEXR R0.xyz, f[TEX4], TEX0        ; set B (.xy)
 *     001e60+00a0:  TEXR R0.xyz, f[TEX4].zwzz, TEX0   ; set A (.zw)
 *
 * So *both* wave-UV layers are time-driven, and each MAD writes both
 * components of its pair — the layers travel diagonally, not along a single
 * axis. That is why this uses WaterMaterial (two counter-drifting layers in
 * U and V) rather than ScrollingMaterial, which moves every channel as one.
 *
 * Note `c457.z` is the fixed multiplier and `c458` is `time`, not the other way
 * round. There is no literal scale factor in these instructions to carry over:
 * the two speeds are the patched uniforms c460/c461, whose values the
 * disassembly does not resolve, so the rates below remain a visual guess.
 *
 * Permutation: Ambient of 21 (index 2) — the lit, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). Index 3 (VP @ 0x002200) was checked and
 *   carries the identical c460/c461 pattern, so this is the general wave
 *   mechanism rather than a quirk of one permutation. The others are TODO.
 */
export const water_noref: MaterialFactory = {
  name: "water_noref.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [waves, skyreflect, , lightMap] = textures;
    const envMap = skyreflect?.clone();
    if (envMap) {
      envMap.mapping = THREE.EquirectangularReflectionMapping;
      envMap.needsUpdate = true;
    }
    return new WaterMaterial({
      side: THREE.DoubleSide,
      ...(waves ? { map: waves } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(envMap ? { envMap } : {}),
      reflectivity: 0.35,
      color: new THREE.Color(0x0a1418),
      specular: new THREE.Color(0xe9e99a),
      shininess: 30,
    });
  },
};
