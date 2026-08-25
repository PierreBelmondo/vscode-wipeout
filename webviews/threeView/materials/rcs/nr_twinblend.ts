import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/nr_twinblend.rcsmaterial
 *
 *   tex[0] #25c5c4d3                    animscaledballs.gtf   -> map
 *   tex[1] #d284858e                    glowbars_noisy.gtf   -> map
 *   tex[2] #8e6240ce                    assegai_landscape03.gtf, assegai_landscape03_glow.gtf, ag_square01cl_glow.gtf   -> emissiveMap
 *   tex[3] #176b1174                    assegai_landscape02.gtf, assegai_landscape02_glow.gtf, ag_square02cl_glow.gtf   -> unused
 *   tex[4] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite declaring `time`. This was previously built as a
 * PulsingMaterial on the assumption that the glow throbs; the disassembly does
 * not support that. `time` (c464, hash #906b67ba) is declared as a uniform in
 * nearly every vertex program of this material, but its single point of use is
 * always the same zero-multiply idiom -- permutation 2 (Ambient, Static,
 * VP @ 0x0f50):
 *
 *     MOV R0.w, c463.yyyy                          ; R0.w = 0
 *     MAD o10(TEX3).x, R0.wwww, c464.xxxx, v8.zzzz ; TEX3.x = 0 * time + V
 *
 * c463 is not among that program's declared uniforms -- only viewProj (c256),
 * eyePositionWorldSpace (c465), time (c464), positionScale (c466) and
 * positionBias (c467) are bound -- so it is a genuine unpatched zero constant,
 * not a disassembler artifact: the disassembler prints a uniform's name
 * wherever a patch site exists, and it prints none here. The MAD therefore
 * passes v8.zzzz through unchanged and `time` contributes nothing.
 *
 * The same idiom recurs verbatim in every other program of the family, always
 * against whichever of c462/c463 that permutation does *not* bind to
 * zoneOrigin: VP @ 0x1240 (perms 3/7/9) and VP @ 0x1a60 (perm 5) via c463,
 * VP @ 0x1630 (perms 4/6/8) via c463 into o12(TEX5).x, and VP @ 0x2d00
 * (perm 11, where c463 really is zoneOrigin) via c462.
 *
 * No fragment program in the family reads c464 at all: FP @ 0x1110 -- the one
 * paired with permutation 2 -- is eight instructions of TEXR/ADDH/LG2R/EX2H/
 * MADH/MULH texture-blend math with no `c` register or uniform name anywhere
 * in it, and the same holds for FP @ 0x1430, 0x1860, 0x1ed0 and 0x2380.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: programs at 0x2f60-0x7fb0+ reference iblScalePower and
 *   paraboloidReflectionTex and belong to permutations outside the table
 *   checked here. If this material animates anywhere, it is in one of those or
 *   in the Shadow/Spot variants, neither of which was traced.
 */
export const nr_twinblend: MaterialFactory = {
  name: "nr_twinblend.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, _unused3, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
