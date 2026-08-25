import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials_dlc/cf_plasma_glow2.rcsmaterial
 *
 *   tex[0] Texture1                     cf_plasma_01.gtf, cf_plasma.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Two files on disk share this name -- materials/ and materials_dlc/. The
 * disassembly below is the materials_dlc copy; the plain materials/ variant is
 * a distinct file and has not been checked.
 *
 * Animated: `time` scrolls the map along V. Permutation index 3 of the table
 * (Static, no shadow, no spot) is the only place in the whole dump where `time`
 * is read inside an instruction rather than merely declared -- it reaches the
 * fragment program as uniform #906b67ba in c[122]:
 *
 *     MOVR R2.zw, f[TEX4].xxxy       ; R2.z = U, R2.w = V   (raw UV1)
 *     MULR R0.xy, R2.zwzz, {?, time, 0, 0}.xyxx
 *                                    ; R0.x = U * #464ac094   <- not time
 *                                    ; R0.y = V * time        <- V is the axis
 *     MULR R0.xy, R0, {...}.x        ; second per-material constant
 *     MADR R0.zw, R2.y, {...}.x, R0.xxxy   ; copy-through into the sample coord
 *     TEXR R0.x, R0.zwzz, TEX0       ; TEX0 == Texture1 == map
 *
 * The x-lane of that first constant register is a real declared uniform slot
 * (#464ac094) whose name the disassembler cannot resolve -- it is not a
 * hardcoded zero, so U is left unanimated here rather than claimed to be
 * pinned. Only the V lane carries `time`, hence rateU = 0.
 *
 * The vertex program hands the UV down untouched -- `MOV o11(TEX4).xy, v2.xyxx`
 * -- and its only use of c464 is `MOV o7(TEX0).xyz, c464.xxxx`, broadcasting
 * time into an unrelated varying, not a UV offset. So the whole animation is
 * the fragment-side MULR above.
 *
 * No literal scale appears in the trace: every factor multiplied into the V
 * term is a constant register the loader patches, so the rate below is the
 * usual guessed drift (see _animated.ts).
 *
 * Approximation: the shader *multiplies* V by time where ScrollingMaterial
 * *adds* an offset each frame. Both make the plasma travel along V; the
 * shader's version also stretches the texture as time grows, which a texture
 * offset cannot reproduce.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const cf_plasma_glow2: MaterialFactory = {
  name: "cf_plasma_glow2.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      0.05,
    );
  },
};
