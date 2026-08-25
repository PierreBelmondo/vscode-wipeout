import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_mult_emissive_scroll.rcsmaterial
 *
 *   tex[0] #75ccafc8                    gradient_firey_01.gtf   -> map
 *   tex[1] #b1f2a176                    track_rail_03_emissive.gtf   -> emissiveMap
 *   tex[2] Texture1                     track_rail_03_colour_spec.gtf   -> specularMap
 *   tex[3] lightmap                     ile_mesh_combine_track01_04-lmap.gtf, ile_mesh_combine_track03_03-lmap.gtf, ile_mesh_combine_track03_04-lmap.gtf   -> lightMap
 *   tex[4] #6d0178af                    (no file)   -> map
 *   tex[5] #7611a2d8                    (no file)   -> map
 *   tex[6] #03e55ee0                    (no file)   -> map
 *   tex[7] #d5814b74                    (no file)   -> map
 *   tex[8] #8ed32c39                    (no file)   -> map
 *   tex[9] #15438bf0                    (no file)   -> map
 *   tex[10] #381a1581                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated, despite the `_scroll` in the name. `time` (#906b67ba) is
 * *declared* in essentially every non-shadow-only FP permutation, and the
 * disassembler's patch-site table resolves its constant slot properly rather
 * than printing a bogus literal -- so the uniform is real and the runtime does
 * patch a live clock into that slot:
 *
 *     005620+0060:  #906b67ba  U  time   c[164]  02010001    ; idx 2, Ambient
 *     005664+00a4:  0002       #906b67ba  R  time   c[2]
 *
 * but no instruction in the compiled program ever reads that slot. The body of
 * that block (0056d0-005a30) contains no `c[2]` operand anywhere; every
 * constant a real instruction sources is an inline literal, several of them
 * genuine zeros rather than a misread `time`:
 *
 *     0058e0+0320:  TEXR H3.xyz, R2, TEX2
 *     0058f0+0330:  DP3H H2.w, H3, {0.300049, 0.589844, 0.109985, 0}   ; luma
 *     005910+0350:  TEXR H4.xyz, R2.zwzz, TEX3
 *     005920+0360:  MULH H5.xyz, H4, {0, 0, 0, 0}
 *     005940+0380:  MULH H0.xyz, H0.w, {0, 0, 0, 0}
 *
 * The richer directional-lit permutation (idx 3, FP @ 005bd0) declares time as
 * c[3] and behaves the same way -- no `c[3]` operand in 005d50-006320, and
 * every texture coordinate is interpolated geometry, not a time-offset UV:
 *
 *     005e10+0240:  TEXR H4.xyz, R3.zwzz, TEX3
 *     005f10+0340:  TEXR H2.xyz, f[TEX4], TEX1
 *     005f40+0370:  TEXR H2.xyzw, f[TEX4], TEX0
 *     006150+0580:  TEXR H1.xyz, R0.zwzz, TEX2
 *
 * Five further permutations that declare time (006510, 006f30, 00cbb0, 00f480,
 * 00fb90) were checked too. In each, the slot appears exactly twice -- once in
 * the uniform table, once in the patch-site remap table -- and zero times in
 * the instruction stream. The paired vertex program (005a40) has no uniforms at
 * all (uc=0) and passes the UV straight through: `MOV o11(TEX4).xy, v2.xyxx`.
 *
 * An earlier version of this factory used PulsingMaterial and claimed the
 * shader modulated the emissive term with `time`. That was a misreading from
 * before the disassembler was fixed and has been removed. If the scroll exists
 * at all it must live in a shadow/spot permutation this project does not
 * implement.
 *
 * Permutation: idx 2 (FP @ 0055c0), Static -- the lit, Ambient, no-shadow,
 *   no-spot point of the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const lambert_spec_mult_emissive_scroll: MaterialFactory = {
  name: "lambert_spec_mult_emissive_scroll.rcsmaterial",
  minTextures: 1,
  maxTextures: 11,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, specularMap, lightMap, map1, map2, map3, map4, map5, map6, map7] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
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
