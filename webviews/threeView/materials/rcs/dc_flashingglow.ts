import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/dc_flashingglow.rcsmaterial
 *
 *   tex[0] Texture1                     dc_flashingalphagradient.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 6 (Backend=Static, Texture1 + fogColour, no shadow/spot/
 *   lightmap bindings) -- the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO. VP crc f0170cc4,
 *   FP crc 67b6ec05.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a one-axis (U) UV scroll of the coordinate used to sample
 * Texture1 / `map`.
 *
 *   VP uniform table:
 *     #906b67ba  U  time  c[464]  02010001
 *
 *   VP code:
 *     001f40+00c0: MOV o10(TEX3).y, v2.yyyy            ; V passthrough
 *     001f80+0100: ADD o10(TEX3).x, v2.xxxx, c464.xxxx ; U = Uv1.x + time
 *
 *   FP code:
 *     0020b0+0060: MOVR R0.x, f[TEX3].z
 *     002100+00b0: TEXR H1.xyz, f[TEX3], TEX0          ; Texture1 at that UV
 *
 * v2 is the `Uv1` attribute (#427214fc) and c[464] is `time`, so TEX3.x is
 * Uv1.x + time and TEX3.y is Uv1.y untouched -- only U moves, hence rateV = 0.
 * The FP feeds f[TEX3] straight into the TEXR of TEX0 (Texture1), so the
 * scrolled coordinate is what samples `map`.
 *
 * Verified against the file's own bytes: the uniform record
 * `90 6b 67 ba | 02 01 00 01 | 01 d0` (hash `time`, register 0x1d0 = 464)
 * occurs in six separate permutation tables, and the same
 * `ADD o10(TEX3).x, v2.xxxx, c464.xxxx` / `MOV o10(TEX3).y, v2.yyyy` pair
 * recurs in every permutation that declares `time` (idx 2-8, 11, 14, 17, 20,
 * ...), so this is the material's consistent behaviour, not permutation noise.
 *
 * Note this contradicts an earlier reading of this material as an emissive
 * pulse: nothing here modulates a colour or emissive term with `time` -- the
 * time term is a UV addend -- so the factory no longer uses PulsingMaterial.
 *
 * The ADD is bare: `time` is added to Uv1.x with no multiplier, so unlike
 * ShieldMaterial's literal 3.0 there is no shader constant to carry through as
 * a named scale. The scroll rate is therefore purely ScrollingMaterial's own
 * unknown default -- see its TODO.
 */
export const dc_flashingglow: MaterialFactory = {
  name: "dc_flashingglow.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.0,
    );
  },
};
