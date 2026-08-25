import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/tech_de_ra_cloud_effect.rcsmaterial
 *
 *   tex[0] Texture1                     cloud_02.gtf   -> map
 *   tex[1] Texture2                     cloud_01.gtf   -> map
 *   tex[2] Texture3                     cloud_mask_02.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #ef18f362                    (no file)   -> map
 *   tex[6] #981fc3f4                    (no file)   -> map
 *   tex[7] #87d769dc                    (no file)   -> map
 *   tex[8] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated. `time` (#906b67ba) is bound to this material's shaders, and the
 * word does appear in one instruction of the implemented permutation's fragment
 * program, but it is multiplied by a hard zero and never reaches a sample.
 * Permutation 2 (Ambient, Static backend, FP at 0011e0 -- the richest binding
 * set, no shadow and no spot), FRAGMENT crc=01ba7297:
 *
 *     MOVR R2.zw, f[TEX3].xxxy                    ; the UV
 *     MOVR R1.x, {0x00000000(0), 0, 0, 0}.x       ; R1.x <- literal 0
 *     MADR R1.z, R1.x, {time, Constant2, 0, 0}.x, R2   ; R1.z = 0*time + R2.z
 *     MADR R0.w, R1.x, {0, 0, 0, 0}.x, R2         ; R0.w = 0*0    + R2.w
 *     TEXR H2.xyz, R1.zwzz, TEX2                  ; sample at the *unchanged* UV
 *
 * R1.x comes from a genuine 0x00000000 literal MOVR, not a mis-resolved uniform,
 * so R1.z collapses to R2.z (which was just set from f[TEX3].x) whatever `time`
 * holds. The coordinate handed to the TEXR is the interpolated one, unmoved.
 *
 * Checked permutation 3 as well (fuller lit variant, FP at 0016c0): `time` is
 * declared in its uniform table at c[170] but the name never appears in any
 * instruction operand there -- the analogous coordinate setup is
 * `MOVR R2.x, {0,0,0,0}.x`, a plain literal zero. No permutation the viewer
 * implements (Static/RigidBody, no shadow, no spot) lets `time` drive a UV, a
 * colour or an emissive term, so this material must not extend an animated base
 * class; an earlier revision had it scrolling/pulsing on the strength of the
 * uniform binding alone, which the disassembly does not support.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const tech_de_ra_cloud_effect: MaterialFactory = {
  name: "tech_de_ra_cloud_effect.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6, map7] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
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
