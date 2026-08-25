import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/sign_emissive_glow2uv.rcsmaterial
 *
 *   tex[0] Texture1                     sign_colour_glow.gtf   -> map
 *   tex[1] Texture2                     start_sign_base.gtf   -> (unused)
 *   tex[2] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: `time` scrolls Texture1 along V, additively, with a literal 0.2
 * scale. Permutation index 3 of the table (Backend=Static, VP 0x12f0,
 * FP 0x14d0) -- the plainest lit permutation: directionalLight0 + fogColour +
 * constantAmbientColour + Texture1/Texture2, no shadow/spot/zone samplers:
 *
 *     MOVR R0.w, {..., time}.x       ; time   (see the swizzle note below)
 *     MULR R1.x, R0.w, {0x3e4ccccd(0.2), 0, 0, 0}.x
 *     MOVR R1.z, R2.w                ; U, from f[TEX3].w -- never touched
 *     ADDR R1.w, f[TEX4], R1.x       ; V' = f[TEX4].x + time * 0.2
 *     TEXR H0.xyzw, R1.zwzz, TEX1    ; TEX1 == Texture1 == map   <- animated
 *     TEXR H0.xyz,  f[TEX5], TEX0    ; TEX0 == Texture2, unmodified UV
 *
 * Axis: the sample coordinate is `R1.zwzz`, so R1.z is U and R1.w is V. Only
 * R1.w carries the time term, hence rateU = 0.
 *
 * Swizzle: the brace-list at 0x15b0 prints the uniforms patching that constant
 * block in hash-sorted declaration order, not slot order, so its positional
 * order does *not* say what `.x` selects. The preamble's register-mapping table
 * does: `#906b67ba R time c[0]`, with constantAmbientColour at c[1] and
 * dirLight0Colour at c[3]. So `.x` = slot 0 = time. Cross-checked against
 * permutation 2's FP (0x1190), whose R-table likewise puts time at c[0].
 * Corroborating: time is declared `02010001` (1-component scalar), consistent
 * with a `.x` scalar read, whereas directionalLight0Colour is `02030001`.
 *
 * The 0.2 is a real inline literal (0x3e4ccccd) and is applied as such, so only
 * the outer drift rate below is guessed. The other `{0x00000000(0), ...}`
 * literals in this program (0x1600, 0x1630, 0x1660, 0x1680, 0x1770) are
 * genuine zeros and none of them sit on the time path.
 *
 * The vertex program (0x12f0) does not read `time` -- it declares only
 * viewProj/eyePositionWorldSpace/positionScale/positionBias. Its
 * `MOV o8(TEX1).xyz, c464.xxxx` references a c464 that is *not* bound to time
 * in this block; the whole animation is the fragment-side ADDR above.
 *
 * Texture2 is sampled at the unmodified interpolator f[TEX5] and never moves.
 * A Phong material has no free channel that multiplies into `map` the way the
 * shader combines the two, so it is left unbound rather than overwriting the
 * animated Texture1.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */

/** The `0.2` (0x3e4ccccd) the shader's MULR scales its time term by. */
const V_SCROLL_SCALE = 0.2;

/** The unknown outer drift rate, as elsewhere (see _animated.ts). */
const V_SCROLL_RATE = 0.05;

export const sign_emissive_glow2uv: MaterialFactory = {
  name: "sign_emissive_glow2uv.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, , lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      V_SCROLL_RATE * V_SCROLL_SCALE,
    );
  },
};
