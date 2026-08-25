import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uvdistortion_diff_vertexcolplusoverlaybloom.rcsmaterial
 *
 *   tex[0] #fb3f2dac                    and_ossego_alpha.gtf   -> map
 *   tex[1] diffuse                      and_tunnelscreens.gtf   -> map
 *   tex[2] emissive                     mr_blueglass_a.gtf   -> emissiveMap
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
 * NOT animated, despite the name. `time` is declared in the uniform table and
 * given a patch slot, but no instruction ever reads it:
 *
 *     0018c4+0054: #906b67ba  U  time    c[190]  02010001   ; declared
 *     00192e+00be: 0004       #906b67ba  R  time    c[4]    ; patch slot only
 *
 * The UV path in the implemented permutation (3: Backend=Static, directional
 * light, no shadow/lightmap/zone textures; FP at file offset 0x001870) takes
 * its coordinate straight from the interpolator and never adds a time term:
 *
 *     001a00+0190: MOVR R2.w, f[TEX4]              ; base UV, no time
 *     001a10+01a0: MOVR R3.y, {?, ?, Distortion, ?}.x
 *     001a40+01d0: MADR R0.zw, R3.y, {0(0),0(0),0(0),0(0)}.x, R2
 *     001a60+01f0: TEXR R1.w, R2.zwzz, TEX0        ; sampled at the *base* UV
 *     001ab0+0240: TEXR H1.xyzw, R2.zwzz, TEX1     ; likewise
 *     001b60+02f0: MADR R3.zw, R3.y, {0(0),0(0),0(0),0(0)}.x, R2
 *
 * Two traps checked and cleared. First, the `.x` swizzle at +01a0 selects word
 * 0 of the block, the unnamed uniform #96e30da5 -- not `Distortion`, which sits
 * in word 2. Second, the constant blocks the two MADRs multiply by (const_off
 * 0x090 and 0x1b0) fall outside this permutation's patch range 0x44..0x6c, so
 * they are genuine literal zeros rather than unresolved uniforms: the
 * distortion offset is multiplied by zero and is inert. The single instruction
 * in this permutation that touches the patched pool is the +01a0 MOVR above.
 *
 * All 15 permutations were checked, including 7-14, which bind zone/shadow/spot
 * textures the viewer does not implement: `time` is read in none of them, and
 * the vertex programs declare only viewProj / eyePositionWorldSpace /
 * positionScale / positionBias. So this is a static material, and an earlier
 * revision of this file that scrolled it via ScrollingMaterial -- on the
 * strength of the "uvdistortion" name and the bare presence of the declaration
 * -- was wrong.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvdistortion_diff_vertexcolplusoverlaybloom: MaterialFactory = {
  name: "uvdistortion_diff_vertexcolplusoverlaybloom.rcsmaterial",
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
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
