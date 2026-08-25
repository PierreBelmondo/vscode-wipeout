import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/10_sebenco_climb/materials/cf_laserrail_cap.rcsmaterial
 *
 *   tex[0] Texture1                     cf_rail_cap1.gtf, reflectcells_dark.gtf   -> map
 *   tex[1] Texture2                     cf_laserrail_grad.gtf, cf_laserrail_grad_red.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine29-lmap.gtf, ile_mesh_combine7-lmap.gtf, ile_mesh_combine11-lmap.gtf   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, the lit, no-shadow, no-spot point of the matrix
 *   (Static backend, directionalLight0 + fog + ambient + Texture1/Texture2;
 *   see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: V-axis UV scroll on Texture2 only. Unusually, `time` is consumed
 * entirely in the *vertex* stage and handed to the fragment stage through the
 * TEX1 interpolator's .w channel.
 *
 *   VERTEX (crc=5ac492c0, file offset 0x001770):
 *     001800+0090: MOV o7(TEX0).w, v8.zzzz
 *     001810+00a0: ADD o8(TEX1).w, v8.wwww, c464.xxxx
 *     001840+00d0: MOV o8(TEX1).xyz, v1.xyzx
 *
 *   FRAGMENT (crc=a34950bc, file offset 0x0018e0):
 *     001980+00a0: MOVR R1.xyzw, f[TEX1]
 *     001990+00b0: MOVR R0.w, R1
 *     0019f0+0110: MOVR R0.z, f[TEX0].w
 *     001a40+0160: TEXR H4.xyz, R0.zwzz, TEX1
 *
 * c464 is uniform #906b67ba `time` (scalar .x). The sample coordinate is
 * R0.zwzz, so R0.w is the vertical component -- and R0.w is the one carrying
 * v8.w + time, while R0.z is the untouched static U from TEX0.w. Hence V, not
 * U. Between the `MOVR R0.w, R1` write and the TEXR that consumes it only R1.w
 * is reassigned (twice, from a genuine literal-zero multiply, not a
 * mis-resolved uniform); R0.w itself is never rewritten, so it still holds
 * v8.w + time at the sample.
 *
 * This FRAGMENT block's uniform table does not declare `time` at all -- only
 * directionalLight0DirectionWorldSpace, directionalLight0Colour, fogColour and
 * constantAmbientColour -- which is what confirms the clock arrives purely via
 * the interpolator.
 *
 * Only Texture2 moves. Texture1 (TEX0, sampler t[0]) is sampled separately at
 * `TEXR H0.xyzw, f[TEX3], TEX0` from static UVs (v8.xy via TEX3), so the cap's
 * base texture stays put while the gradient scrolls under it. The attribute
 * table confirms TEX1 == Texture2 (hash #a2d555b9, sampler t[1]).
 *
 * The ADD has no scale factor multiplied in -- it is straight `v8.w + time`,
 * coefficient 1.0, unlike the "3.0"-style literal in ShieldMaterial. So no
 * scale constant is introduced here; rateU is pinned to 0 for the axis that
 * does not move and rateV carries the drift directly. The real rate is not
 * recoverable from the SHO (see ScrollingMaterial's own TODO), so rateV is
 * still a guess -- but the *axis* is established.
 *
 * The same time -> TEX1.w -> TEXR(TEX1) pattern recurs identically in sibling
 * permutations (2 Ambient, 4, 5, 6, ...) at their own offsets, so this is a
 * stable property of the material rather than an artifact of permutation 3.
 */
export const cf_laserrail_cap: MaterialFactory = {
  name: "cf_laserrail_cap.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      0.05,
    );
  },
};
