import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/emissive_alpha_heathaze_noalpha.rcsmaterial
 *
 *   tex[0] #fd669142                    rocks_01_matte_colour_alpha.gtf   -> map
 *   tex[1] #c39746d2                    fractal_noise.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #737084b2                    (no file)   -> map
 *   tex[4] #7eec5275                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #5b71c54f                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: Idx 2, "Ambient" — the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * NOT animated. `time` (#906b67ba) is declared in this permutation's uniform
 * table and even given a relocation patch slot, but it is never read as an
 * operand anywhere in the instruction stream. The whole FP block at file offset
 * 0010b0 (crc=a5494ebc) was checked instruction by instruction:
 *
 *     #906b67ba  U  time  c[108]  02010001     ; declared...
 *     #906b67ba  R  time  c[1]                 ; ...and patch-slotted
 *     -- fp code --
 *     MOVR R1.x, {0}.x
 *     MOVR R0.zw, f[TEX3].xxxy                 ; the UV
 *     MULR R0.xy, R0.zwzz, {4, 1, 0, 0}.xyxx   ; UV scaled into noise space
 *     MULR R0.xy, R0, {0}.x
 *     MADR R0.xy, R1.x, {0}.x, R0              ; addend is a real zero
 *     TEXR R0.x, R0, TEX0                      ; heat-haze noise sample
 *     MULR R0.x, R0, {0}.x
 *     MADR R0.xy, R0.x, {0.01, 0, 0, 0}.x, R0.zwzz  ; noise perturbs the UV
 *     TEXR H0.xyz, R0, TEX1                    ; colour at the perturbed UV
 *     MULH H0.xyz, H0, {0}
 *     MOVH H0.w, {0}                           ; END
 *
 * Every constant operand there is a resolved literal (0, 4, 1, 0.01) or a
 * register — no uniform name appears inline. So the emissive/H0 chain is built
 * entirely from texture samples and constants, with no time term.
 *
 * A sibling Static permutation (Idx 3, FP-off 001420, crc=e9a40b5d, which also
 * adds fogColour) *does* consume time by name — "MULR R0.xy, R2.zwzz,
 * {?, time, 0, 0}.xyxx", scaling the V coordinate before a TEXR. An earlier
 * comment here claimed this material pulsed its emissive term with `time`; that
 * was a misread of that sibling permutation (or of the always-zero patch bytes
 * next to the declaration) and the factory has been reverted from
 * PulsingMaterial to a plain Phong material accordingly.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths, and the noise-driven UV
 *   perturbation that gives the heat haze its name, have not been transcribed.
 */
export const emissive_alpha_heathaze_noalpha: MaterialFactory = {
  name: "emissive_alpha_heathaze_noalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
