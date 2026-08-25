import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_mult_scroll.rcsmaterial
 *
 *   tex[0] Emissive                     bluewhite_band_colour_scroll.gtf   -> emissiveMap
 *   tex[1] Texture1                     bluewhite_band_colour_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_05-lmap.gtf, ile_mesh_combine_track03_05-lmap.gtf   -> lightMap
 *   tex[3] #6d0178af                    (no file)   -> map
 *   tex[4] #464ac094                    (no file)   -> map
 *   tex[5] #8ed32c39                    (no file)   -> map
 *   tex[6] #05fec07d                    (no file)   -> map
 *   tex[7] #549310b8                    (no file)   -> map
 *   tex[8] #1b83fd49                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. `time` (#906b67ba) is declared in the uniform
 * table of 4 of the 21 permutations, e.g. the plainest lit one (FP-off 001c40):
 *
 *     001cd0+0090:  #906b67ba  U  time  c[192]  02010001
 *
 * but no instruction in that program reads it -- every constant operand there
 * prints as an inline literal. Across the whole `rcsdump material -d` output,
 * VP and FP of all 21 permutations, `time` is named inside an instruction
 * operand exactly once, in the Ambient permutation at FP-off 001890:
 *
 *     MOVR R0.w, {constantAmbientColour, time, 0x00000000(0), 0x00000000(0)}.x
 *     MADR R1.x, R0.w, {0x00000000(0), ...}.x, R2.w
 *     TEXR H2.xyz, R1, TEX1
 *
 * and even there the read misses it: fp_print_const() emits the four constant
 * words positionally as x,y,z,w and applies the swizzle afterwards, so `.x`
 * selects word 0, `constantAmbientColour`, while `time` sits unread in word 1.
 * The two TEXR calls in that block sample `f[TEX3]` and a lighting-derived R1
 * with no time-derived offset upstream, so the "scroll" in the material's name
 * is not something the implemented permutations do.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: `time` being bound but dead in every permutation this viewer implements
 *   leaves the shadow/spot-only permutations unchecked. If a scroll turns up in
 *   one of those, it belongs here as a ScrollingMaterial (see _animated.ts).
 */
export const lambert_spec_mult_scroll: MaterialFactory = {
  name: "lambert_spec_mult_scroll.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, specularMap, lightMap, map, map1, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
