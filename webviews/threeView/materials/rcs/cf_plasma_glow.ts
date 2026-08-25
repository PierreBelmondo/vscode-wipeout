import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/cf_plasma_glow.rcsmaterial
 *
 *   tex[0] Texture1                     shipplasma.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine5-lmap.gtf   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 53, Static/Ambient, no shadow, no spot -- the lit point of
 *   the matrix this viewer implements (see _abstract.ts). The others are TODO.
 *
 * NOT animated. `time` (#906b67ba) is bound for this permutation, but it is a
 * dead uniform here. The whole fragment program at FP offset 0x005480 is:
 *
 *     MOVR R1.x, {0, 0, 0, time}.x      ; .x selects slot 0 -- the literal 0,
 *                                       ;   NOT slot .w where `time` sits
 *     MOVR R1.zw, f[TEX0].xxxy          ; the static UV attribute
 *     MADR R0.x, R1, {0.2, 0, 0, 0}.x, R1.w
 *     MOVR R0.z, R1
 *     MULR R0.w, R0.x, {0, 0.8, 0, 0}.y
 *     ADDR R0.xy, R1.zwzz, {0, 0, 0, 0}.x
 *     TEXR R0.w, R0.zwzz, TEX0          ; first sample
 *     ADDR R0.xy, R0, R0.w              ; it perturbs the second coordinate
 *     TEXR H0.xyz, R0, TEX0             ; second, distorted sample
 *     MOVH H0.w, 1.0                    ; END
 *
 * so this is a static distortion/refraction chain: one TEX0 lookup displaces
 * the UV of a second TEX0 lookup, driven only by f[TEX0] and the literals
 * 0.2 / 0.8. Both TEXR coordinate registers trace back through R1.zw and
 * constants alone -- no time-derived term reaches either. Checked instruction
 * by instruction; the earlier claim in this file that the emissive term was
 * modulated by `time` was wrong and has been removed.
 *
 * `time` IS genuinely consumed in other permutations of this same material,
 * the ones with shadowMapTex/Spot bindings (e.g. FP offset 0x005f20 does
 * `MULR R0.x, f[FOGC], {fogColour, time, 0, 0}.w`, a real .w read), which is
 * why the uniform is declared at all. It just is not read by the plain
 * Static/Ambient permutation implemented here.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths, and the double-lookup
 *   distortion above, have not been transcribed.
 */
export const cf_plasma_glow: MaterialFactory = {
  name: "cf_plasma_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
