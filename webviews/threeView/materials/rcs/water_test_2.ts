import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * Placeholder scroll speeds. Each MAD below writes *both* components of its
 * texcoord pair, so there is no per-axis constant to map these onto -- the real
 * speeds are the unresolved uniforms c461/c462/c463. See _water.ts.
 */
const SCROLL_U = 0.02;
const SCROLL_V = 0.013;

/**
 * data/environments/*\/materials/water_test_2.rcsmaterial
 *
 *   tex[0] ?  waves2.gtf
 *   tex[1]    lightmap
 *   Colour        (0.000, 0.553, 0.592)  teal
 *   Reflectivity  (0.155, 0.155, 0.155)
 *
 * Brighter, more saturated water than water_noref — a lagoon rather than open
 * sea. The Colour constant is applied as the material tint.
 *
 * Permutation: idx 53 "Ambient" (Backend=Static), the lit, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO. VP block
 *   @0x029e40, FP block @0x00b240.
 *
 * Animated: the *vertex* program scrolls the reflection sample coordinates on
 * both axes from `time` (c[460], hash #906b67ba), which is read exactly once
 * and then broadcast into three MADs:
 *
 *     029ebc+007c: #906b67ba  U  time  c[460]  02010001
 *     ...
 *     029fa0+0160: MUL R1.xy, v4.xyxx, c464.xxxx
 *     029f90+0150: MUL R1.zw, v4.xxxy, c466.xxxx
 *     029f80+0140: MUL R2.xy, v4.xyxx, c465.xxxx
 *     029fb0+0170: MOV R2.z, c459.xxxx           ; seed (a named uniform)
 *     029fe0+01a0: MUL R2.z, R2.zzzz, c460.xxxx  ; * time   <- the only read
 *     029ff0+01b0: MAD o10(TEX3).zw, R2.zzzz, c462.xxxx, R1.xxxy
 *     02a000+01c0: MAD o10(TEX3).xy, R2.zzzz, c463.xxxx, R1.zwzz
 *     02a020+01e0: MAD o11(TEX4).xy, R2.zzzz, c461.xxxx, R2.xyxx
 *
 * and the fragment program samples TEX0 at precisely those three coordinates:
 *
 *     00b2d0+0090: TEXR R1.xyz, f[TEX3], TEX0
 *     00b300+00c0: TEXR R1.xyz, f[TEX3].zwzz, TEX0
 *     00b360+0120: TEXR R0.xyz, f[TEX4], TEX0
 *
 * So this is a UV scroll of the reflection lookup on both u and v across two
 * texcoord sets — not an emissive pulse, and not a vertex *position* offset:
 * HPOS is built only from the viewProj constants c256-259 and never sees time.
 * Each MAD writes both components of its pair, so every layer drifts in U and
 * V at once -- the scroll is diagonal, and neither axis rate is zero. That
 * multi-layer structure is why this keeps WaterMaterial rather than the generic
 * ScrollingMaterial, which moves every channel as one rigid group.
 *
 * No literal scale accompanies the multiply. The other operand of the time
 * MUL is c459, a named-but-unresolved uniform (printed `U ? c[459]`, hash
 * #9b5f269e, not an inline `0x00000000(0)` literal), and the three per-
 * destination weights c461/c462/c463 are likewise uniforms the loader patches.
 * The rates below are therefore still the plausible defaults, not recovered
 * values — only the *axes* are established.
 *
 * Checked: no other permutation in the Static/RigidBody, no-shadow/no-spot
 *   family reads time by name; idx 52 (ZAlphaOnly), 54 (SunOcclusionVertex)
 *   and 55 (SunOcclusionLightmap) lack the time uniform entirely.
 *
 * TODO: recover c459 and c461/c462/c463 from the engine's material setup to
 *   get the three real layer speeds.
 */
export const water_test_2: MaterialFactory = {
  name: "water_test_2.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [waves, lightMap] = textures;
    return new WaterMaterial(
      {
        side: THREE.DoubleSide,
        ...(waves ? { map: waves } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        color: new THREE.Color(0x008d97),
        reflectivity: 0.155,
        specular: new THREE.Color(0x888888),
        shininess: 60,
        transparent: true,
        opacity: 0.85,
      },
      // Both axes scroll: each MAD writes both components of its texcoord
      // pair. Values are defaults; see the note above.
      SCROLL_U,
      SCROLL_V,
    );
  },
};
