import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/cf_offset_animated_lights.rcsmaterial
 *
 *   tex[0] Texture1                     cf_honeycomb.gtf, cf_ani_arrow1.gtf   -> map
 *   tex[1] Texture2                     cf_chen_grad1.gtf, cf_chen_grad2.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine13-lmap.gtf   -> lightMap
 *   tex[3] #70e24b2d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (Static backend, VP@0x001230, FP@0x0013c0 -- see _abstract.ts). The others
 *   are TODO.
 *
 * `time` is consumed by this material, but in the VERTEX program only, and only
 * as a scalar packed into a spare varying channel:
 *
 *     -- VP@0x001230 uniform table --
 *     #70e24b2d  U  ?      c[463]      ; unnamed per-material scalar
 *     #906b67ba  U  time   c[464]
 *     -- VP@0x001230 code --
 *     MOV o8(TEX1).xyz, v1.xyzx              ; TEX1.xyz = vertex normal
 *     MOV R0.w, c463.xxxx
 *     MAD o8(TEX1).w, R0.wwww, c464.xxxx, v8.wwww   ; TEX1.w = time*c463 + v8.w
 *
 * so TEX1.w carries a per-vertex time offset alongside the normal in .xyz. It
 * is not a UV scroll: neither texture's own coordinate pair is touched. There
 * is no fragment-side multiply or add of a colour or emissive term by `time` in
 * any of the plain lit permutations (3, 5, 7, 9, 11, 13), which all share this
 * same VP pattern. This file previously claimed the shader pulses its emissive
 * with `time` and used PulsingMaterial; the disassembly contradicts that, so it
 * is a plain Phong material again.
 *
 * In this permutation's fragment program the offset is in fact dead -- its only
 * reader of the varying is a 3-component dot product that never touches .w:
 *
 *     -- FP@0x0013c0 code --
 *     MOVR R1.xyzw, f[TEX1]
 *     MOVR R0.w, R1
 *     DP3R H0.w, R1, {fogColour, constantAmbientColour, 0, 0}   ; reads .xyz only
 *     TEXR H4.xyz, R0.zwzz, TEX1     ; UVs are f[TEX0].w / f[TEX2].w
 *     TEXR H0.xyzwv, f[TEX3], TEX0   ; f[TEX3] used directly
 *
 * TODO: vertex-program animation. The offset would have to be applied in the
 *   vertex stage, which this viewer has no support for, and a consumer of
 *   TEX1.w only appears in a permutation not implemented here (if at all). Left
 *   static rather than faked with a fragment-stage scroll or pulse.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const cf_offset_animated_lights: MaterialFactory = {
  name: "cf_offset_animated_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
