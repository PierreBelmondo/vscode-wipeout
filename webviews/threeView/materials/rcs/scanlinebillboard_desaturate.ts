import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/adverts/scanlinebillboard_desaturate.rcsmaterial
 *
 *   tex[0] #6f469b89                    billboard4.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf   -> map
 *   tex[4] #cde7e5d7                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #08a111e3                    (no file)   -> map
 *   tex[7] #5895bced                    (no file)   -> map
 *   tex[8] #0942573b                    (no file)   -> map
 *   tex[9] #d09c054d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (Idx 2, Backend=Static, fp at 0x0011f0, fp size 0x320; see _abstract.ts).
 *   The others are TODO.
 *
 * NOT animated. The permutation implemented here *declares* the engine's `time`
 * uniform in its constant table:
 *
 *     001238+0048: #906b67ba  U  time  c[140]  02010001
 *
 * but never reads it. All 35 fragment instructions in the 0x0f0-0x310 code block
 * were scanned and none name `time`. The one instruction that looks like a
 * time-driven coordinate offset is:
 *
 *     001300+0110: MULR R1.xy, R0.zwzz, {0x00000000(0), ?, ?, ?}.x
 *
 * The identical bytecode (`06020200 5c001c9d 00020000 c8000001`) appears in a
 * richer sibling permutation (Idx 3/7, fp at 0x0016a0) where more uniforms
 * resolve to names:
 *
 *     0017d0+0130: MULR R1.xy, R0.zwzz, {fogColour, ?, ?, time}.x
 *
 * proving the constant's layout is [fogColour, ?, ?, time] and that the `.x`
 * swizzle selects fogColour, not the `.w` slot where `time` lives. `time` is
 * declared but dead here, so this factory does NOT extend ScrollingMaterial (an
 * earlier revision claimed a UV scroll; that claim was unsupported).
 *
 * The scanline/desaturate maths itself is in the FP: ADDH/MADH about H3.x
 * desaturates the diffuse sample towards its red channel, and an SLTH against
 * 0.5 plus a screen-blend combine layers the scanline texture over it.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const scanlinebillboard_desaturate: MaterialFactory = {
  name: "scanlinebillboard_desaturate.rcsmaterial",
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
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
