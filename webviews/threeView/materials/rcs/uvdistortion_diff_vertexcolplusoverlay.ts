import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/uvdistortion_diff_vertexcolplusoverlay.rcsmaterial
 *
 *   tex[0] #fb3f2dac                    feisar_square01.gtf, mr_line_rgb_clouds_alpha.gtf, and_ossego.gtf   -> map
 *   tex[1] diffuse                      mar_cellular_lamps_blue.gtf, dc_gradient.gtf, and_tunnelscreens_small.gtf   -> map
 *   tex[2] emissive                     and_station3_facing.gtf, mr_line_rgb_clouds_alpha.gtf, and_line_rgb_clouds_alpha.gtf   -> emissiveMap
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #d0989794                    (no file)   -> map
 *   tex[5] #96e30da5                    (no file)   -> map
 *   tex[6] #961662ae                    (no file)   -> map
 *   tex[7] #fe619466                    (no file)   -> map
 *   tex[8] #c0594d0e                    (no file)   -> map
 *   tex[9] #2bdce348                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. The uniform table does declare the engine's
 * clock -- at FP-off 001cd4 the table carries
 *
 *     001cd4+0054:  #906b67ba  U  time      c[190]  02010001
 *     001d3e+00be:  0004       #906b67ba  R  time   c[4]
 *
 * but those are only the declaration and the loader's patch-site relocation
 * line: `time` is never an instruction operand. The UV offset the material's
 * name refers to comes from its own static `Distortion` uniform instead:
 *
 *     MOVR R2.w, {?, ?, Distortion, ?}.x
 *     MADR R1.zw, R2.w, {0(0), 0(0), 0(0), 0(0)}.x, R3
 *     MADR R2.zw, R2.w, {0(0), 0(0), 0(0), 0(0)}.x, R3
 *     TEXR H0.xyzw, R3.zwzz, TEX1
 *     TEXR R3.w, R3.zwzz, TEX0
 *
 * so the sample coordinate is displaced by a constant, not by a clock, and the
 * result is a still image. Grepping all 21 permutations (Ambient,
 * AmbientShadow, ZAlphaOnly, the prelit, zone, shadow and lightmap variants),
 * VP and FP alike, for `time` as an operand returns nothing -- it is dead code
 * everywhere it is declared. An earlier version of this factory used
 * ScrollingMaterial on the strength of a disassembler that mis-rendered those
 * patch-site reads as real uniform loads; that claim was wrong and is gone.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths, including the `Distortion`
 *   coordinate offset, has not been transcribed.
 */
export const uvdistortion_diff_vertexcolplusoverlay: MaterialFactory = {
  name: "uvdistortion_diff_vertexcolplusoverlay.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
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
