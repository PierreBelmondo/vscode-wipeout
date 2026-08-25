import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/uv_anim_diffuse_alpha_emissive.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              air_traffic_test_a_atoc.gtf   -> map
 *   tex[1] #b1f2a176                    air_traffic_test_emissive.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #c4ea9e73                    (no file)   -> map
 *   tex[4] #33d51367                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts) -- Diffuse_Texture + directionalLight0 + fogColour +
 *   constantAmbientColour. The others are TODO. VP block @0x0013b0 (crc
 *   b74e62ad), FP block @0x001580 (crc b3ebb7cc).
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: `time` (hash #906b67ba) is bound to the *vertex* program here, not
 * the fragment program, and it drives a single-axis UV scroll:
 *
 *     #33d51367  U  ?      c[463]  02010001   ; per-material U-rate uniform
 *     #906b67ba  U  time   c[464]  02010001
 *     ...
 *     MOV o11(TEX4).y, v2.yyyy                     ; V' = Uv1.y, untouched
 *     MOV R0.w, c463.xxxx                          ; R0.w = rateU
 *     MAD o11(TEX4).x, R0.wwww, c464.xxxx, v2.xxxx ; U' = rateU * time + Uv1.x
 *
 * and the fragment program samples both texture channels at that one scrolled
 * varying, with no swizzle, so they consume TEX4.xy as-is and stay registered:
 *
 *     TEXR H2.xyzw, f[TEX4], TEX0   ; Diffuse_Texture (#fb17503f) -> map
 *     TEXR H2.xyz,  f[TEX4], TEX1   ; emissive        (#b1f2a176) -> emissiveMap
 *
 * Only o11(TEX4).x carries the time addend; .y is a plain MOV of the incoming
 * Uv1.y. Hence rateV is 0 below -- the pattern slides horizontally and does not
 * drift vertically.
 *
 * No literal scale: the factor multiplied against `time` is the uniform c463
 * (hash #33d51367, category U, size 1), not a baked constant, so nothing from
 * the instruction stream is folded into the rate below and the true speed is
 * not recoverable from the SHO -- only that U scrolls and V does not.
 *
 * Permutation 5 shares this exact FP and an equivalent VP (`MAD o11(TEX4).x,
 * R1.xxxx, c464.xxxx, v2.xxxx`), so the finding is not permutation-specific.
 *
 * NOT a pulse: the FP does contain `{0x00000000(0), ...}` operands (the light
 * dot-product, the fog MADR, and the emissive blend factor in `MADH H2.xyz, H2,
 * {0x00000000(0),...}.x, H3`), but those are genuine pre-patch zeros in the
 * file's raw bytes -- `time` appears nowhere by name in FP b3ebb7cc. An earlier
 * revision of this factory used PulsingMaterial and claimed the shader
 * "modulates the emissive term with it, so the glow pulses"; that was wrong.
 *
 * TODO: `time` *is* read by the fragment program of the zone permutations
 *   (7-14, e.g. `#906b67ba time c0000008`), where it drives the zone-tint
 *   effect. That is a separate feature these factories do not implement.
 *
 * TODO: resolve #33d51367 to a friendly name via scripts/hashes.ts to recover
 *   the intended speed.
 */
export const uv_anim_diffuse_alpha_emissive: MaterialFactory = {
  name: "uv_anim_diffuse_alpha_emissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.0,
    );
  },
};
