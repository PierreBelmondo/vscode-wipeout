import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/15_anulpha_pass/materials/cf_plasma_glow3.rcsmaterial
 *
 *   tex[0] Texture1                     cf_plasma_01.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: `time` scrolls the map along V, and nothing else. From permutation 2
 * (Backend=Static "Ambient", VP @0x000ed0, FP @0x001000, FRAGMENT crc=89a055fa),
 * where the vertex program hands the UV down one component per interpolator --
 * `MOV o7(TEX0).w, v2.xxxx` (u) and `MOV o8(TEX1).w, v2.yyyy` (v):
 *
 *     MOVR R1.xyzw, f[TEX0]                    ; R1.w = u
 *     MOVR R0.xyzw, f[TEX1]                    ; R0.w = v
 *     MOVR R2.w, {time, 0, 0, 0}.x             ; R2.w = time
 *     MADR R2.w, R2, {0x3f000000(0.5), ...}.x, R0
 *                                              ; R2.w = time * 0.5 + v
 *     MOVR R2.z, R1.w                          ; R2.z = u
 *     MOVR R1.z, R1.w ; MOVR R1.w, R0          ; R1.zw = (u, v)
 *     TEXR R0.w, R1.zwzz, TEX0                 ; n = unperturbed sample of the same map
 *     ADDR R0.zw, R2, R0.w                     ; (u + n, v + time*0.5 + n)
 *     TEXR H0.xyz, R0.zwzz, TEX0               ; TEX0 == Texture1 == map
 *
 * The `.zwzz` swizzle puts z first (u) and w second (v), so the time term lands
 * on V only -- hence rateU = 0. Both TEXR read TEX0, the `map` channel; no
 * emissive or colour term is touched by `time`.
 *
 * The `0.5` is a genuine inline literal (0x3f000000) in the MADR, not a patched
 * constant slot, and it multiplies `time` directly -- there is no per-material
 * rate uniform between them. So it is the whole V rate and is applied as such,
 * rather than scaling a guessed drift the way sign_emissive_glow2uv does.
 *
 * Resolving that took reading the FP preamble by hand: it is a count followed by
 * pointers to per-uniform patch-site lists (`[n_sites(u16)][instr_index(u16)]`),
 * keyed by constant slot, not the hash-sorted uniform order the disassembler
 * assumes -- so its inline `{fogColour, time, ...}` labels are unreliable.
 * Decoded correctly, permutation 2 has exactly one `time` patch site: instruction
 * index 3, the constant block at file 0x1080 consumed by the MOVR above.
 *
 * Approximation: the first TEXR feeds its own result back in as a UV offset, so
 * the plasma distorts itself as it travels. A texture offset cannot reproduce
 * that feedback term -- only the steady V scroll survives here.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. `time` is declared and consumed
 *   only in permutations 2-6; the zone-lit sets (7-14) do not declare it at all,
 *   so there is no UV animation in those.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */

/** The `0.5` (0x3f000000) the shader's MADR multiplies `time` by to make V'. */
const V_SCROLL_SCALE = 0.5;

export const cf_plasma_glow3: MaterialFactory = {
  name: "cf_plasma_glow3.rcsmaterial",
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
      V_SCROLL_SCALE,
    );
  },
};
