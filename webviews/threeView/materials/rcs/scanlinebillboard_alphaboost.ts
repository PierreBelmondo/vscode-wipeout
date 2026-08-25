import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/adverts/scanlinebillboard_alphaboost.rcsmaterial
 *
 *   tex[0] #6f469b89                    billboard5.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf   -> map
 *   tex[4] #90bd163f                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #08a111e3                    (no file)   -> map
 *   tex[7] #5895bced                    (no file)   -> map
 *   tex[8] #0942573b                    (no file)   -> map
 *   tex[9] #d09c054d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: Static, Ambient (idx 2, FP-off 001870, FPsz 0320) -- the lit,
 *   Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts). The
 *   others are TODO.
 *
 * NOT animated, despite the name. This permutation *declares* the engine clock
 * in its uniform table and the header resolves it to a constant slot:
 *
 *     F  #906b67ba  time                       c0000004
 *     0018b8+0048: #906b67ba  U  time  c[140]  02010001
 *     0018fc+008c: 0000                        #906b67ba  R  time  c[0]
 *
 * but no instruction in the fragment program body (001960..001b70, `-- fp code --`
 * through `; END`) ever names it as an operand. Every constant read in that block
 * prints as a raw literal -- 0, 0.5, 1.0 -- e.g.
 *
 *     001980+0110: MULR R2.w, R0.y, {0x00000000(0), ?, ?, ?}.x
 *     001aa0+0230: SLTH, H0, {0(0), 0x3f000000(0.5), 0, 0}.y
 *     001af0+0280: ADDH H3.xyz, -H0, {0x3f800000(1), 0, 0, 0}.x
 *     001b70+0300: MULH H0.xyz, H2, {0, 0, 0, 0}          ; END
 *
 * and all four texture fetches read only the interpolated UVs:
 *
 *     TEXR H0.xyz, f[TEX3], TEX0
 *     TEXR R1.yz,  R0.zwzz, TEX1
 *     TEXR H4.xyz, R2,      TEX2
 *     TEXR H1.xyz, R0.zwzz, TEX1
 *
 * This is not a disassembler limitation: elsewhere in the same file (FP offset
 * 0066a0) a genuinely-read patched constant *is* resolved inline by name --
 * `MOVH H0.w, {fogColour, Constant1, 0, 0}.x` -- so the resolver would have
 * printed `time` here if anything read it. An earlier revision of this factory
 * wrapped the material in ScrollingMaterial on the strength of a stale dump;
 * there is no scroll, no time-based UV offset and no time-based colour
 * modulation in the implemented permutation, so it is a plain Phong.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: the richer Static permutations (idx 3-8) bind `time` to other constant
 *   indices alongside fogColour and extra texture slots; their FP bodies were
 *   not traced, so one of those may yet animate.
 */
export const scanlinebillboard_alphaboost: MaterialFactory = {
  name: "scanlinebillboard_alphaboost.rcsmaterial",
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
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
