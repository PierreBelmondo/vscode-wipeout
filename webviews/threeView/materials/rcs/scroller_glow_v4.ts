import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/scroller_glow_v4.rcsmaterial
 *
 *   tex[0] #7ae5e199                    scroller_glow_o_alpha.gtf, scroller_glow_b_alpha.gtf   -> map
 *   tex[1] #173fbce2                    scroller_multiply_01.gtf, scroller_multiply.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_track02_03-lmap.gtf   -> lightMap
 *   tex[3] #e1d9e1e0                    (no file)   -> map
 *   tex[4] #87d769dc                    (no file)   -> map
 *   tex[5] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. `time` (#906b67ba) is declared as an
 * available fragment uniform, but no instruction consumes it. In the Ambient
 * permutation (Backend=Static, FP at 0x1710 -- the plainest lit permutation and
 * the one this factory implements) the clock appears only in the uniform
 * declaration and patch-index tables:
 *
 *     001734+0024:  #81db67ea  U  constantAmbientColour  c[102]
 *     00174c+003c:  #906b67ba  U  time                   c[106]   <- declared
 *     001758+0048:  #e1d9e1e0  U  ?                      c[108]
 *     00177a+006a:  0000                     #906b67ba  R  time   c[0]
 *
 * and never inside the code that follows:
 *
 *     MOVR R1.zw, f[TEX3].xxxy       ; the UV, passed straight through
 *     MADR R1.y,  R1.x, <lit 0>, R1.w
 *     MULR R0.w,  R1.z, 0.1          ; a real literal, 0x3dcccccd
 *     TEXR H0.xyz, f[TEX3], TEX0     ; sampled at the *unmodified* UV
 *     MULR R1.x,  R0.w, <lit 0>
 *     TEXR H1.xyz, R1, TEX1
 *     MULH H1.xyz, H0, H1
 *     ADDH H0.xyz, f[TEX0], <lit>
 *     MADH H0.xyz, H0, H1, H1  ; END
 *
 * The scroll-shaped maths here is built from real literals (notably the 0.1)
 * and one uniform whose hash is absent from format/rcs/hashes.c, so rcsdump
 * prints it as `?`. That `?` is a genuine unnamed patch site, not a misread
 * clock -- the disassembler substitutes a name only when it resolves the hash.
 *
 * Checked all four fragment programs in this file that declare `time`
 * (0x1710, 0x1a60, 0x1fe0, 0x4c80): in each it occurs only on `U`/`R` table
 * lines, never as an instruction operand. Filtering the whole 1661-line
 * disassembly to just the `-- fp code --` bodies yields zero matches for
 * `time` across all 12 fragment programs and 21 permutations. So this factory
 * must not extend ScrollingMaterial: nothing here moves.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: identify the unresolved `?` uniform (its hash is not in
 *   format/rcs/hashes.c). If anything drives this material over time, it is
 *   that uniform rather than the engine clock.
 */
export const scroller_glow_v4: MaterialFactory = {
  name: "scroller_glow_v4.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
