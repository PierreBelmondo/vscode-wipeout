import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uvdistortion_diff_vertexcol.rcsmaterial
 *
 *   tex[0] diffuse                      and_station_strip.gtf, and_pipelight.gtf   -> map
 *   tex[1] emissive                     and_line_rgb_clouds_alpha.gtf, dc_ag_gradanim.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section4_04-lmap.gtf, ile_mesh_combine_track_section4_01-lmap.gtf, ile_mesh_combine_track_section4_05-lmap.gtf   -> lightMap
 *   tex[3] #d0989794                    (no file)   -> map
 *   tex[4] #961662ae                    (no file)   -> map
 *   tex[5] #2bdce348                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. `time` (#906b67ba) and `Distortion`
 * (#d0989794) are declared as uniforms by most fragment permutations in this
 * bundle, but no instruction in any of them ever reads either one. In the
 * plainest lit permutation (FRAGMENT @007070, "Static", no shadow, no spot)
 * they land at c[0] and c[1]:
 *
 *     0070b8+0048:  #906b67ba  U  time         c[132]  02010001
 *     0070f4+0084:  0000        #906b67ba  R  time     c[0]
 *     0070d0+0060:  #d0989794  U  Distortion   c[136]  02010001
 *     0070f8+0088:  0001        #d0989794  R  Distortion  c[1]
 *
 * and the only instruction in the whole file whose printed constant tuple
 * mentions `time` by name is:
 *
 *     007190+0120:  ADDR R0.zw, R0.xxxy, {fogColour, time, ?, Distortion}.x
 *
 * That tuple is a printing artifact of fp_print_const (rcs/format/sho/fp.c):
 * it names all four co-resident uniforms sharing that 16-byte constant load,
 * each patched independently at its own 4-byte offset, and the trailing
 * swizzle picks the single lane actually consumed. Here it is `.x` = lane 0 =
 * `fogColour` (R c[6]), not `time`. The same shape recurs at FRAGMENT @002540
 * in the richer shadow/lightmap permutation --
 * `ADDR R0.xy, R2, {directionalLight0Colour, fogColour, constantAmbientColour, time}.x`
 * -- where `.x` again selects `directionalLight0Colour`.
 *
 * Checked: all 15 fragment programs and all 23 vertex programs in the bundle
 * (27 permutations). No VP declares or reads `time` at all, and neither `time`
 * nor `Distortion` is ever the selected lane of any swizzled operand. So this
 * material must NOT extend ScrollingMaterial -- there is no UV scroll or
 * distortion to drive. If a permutation outside this bundle (a spot-light
 * variant, say) is later found to consume them, revisit.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvdistortion_diff_vertexcol: MaterialFactory = {
  name: "uvdistortion_diff_vertexcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
