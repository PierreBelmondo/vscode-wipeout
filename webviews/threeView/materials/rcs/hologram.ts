import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/hologram.rcsmaterial
 *
 *   tex[0] Texture1                     advert_a.gtf, advert_f.gtf, advert_b.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #7611a2d8                    (no file)   -> map
 *   tex[3] #31182e0d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: #2 "Ambient", Static backend -- the lit, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). VP block @0x000f60, FP block
 *   @0x001100 (disassembled from the modesto_heights copy of the material,
 *   which shares the shader). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the vertex program scrolls Texture1's UV along U only. It declares
 * two per-material uniform reads -- `time` (#906b67ba, c[464]) and `Speed`
 * (#31182e0d, c[463]) -- and spends them on a single MAD:
 *
 *     MOV R0.w, c463.xxxx                           ; R0.w = Speed
 *     MOV o10(TEX3).y, v2.yyyy                      ; V  = Uv3.y   (no time)
 *     MAD o10(TEX3).x, R0.wwww, c464.xxxx, v2.xxxx  ; U' = Speed * time + Uv3.x
 *
 * and the fragment program samples Texture1 at that varying:
 *
 *     MOVH H0.w, {0, 0, 0, Constant1}.x
 *     TEXR H0.xyz, f[TEX3], TEX0                    ; Texture1 at (U', V)
 *
 * V is written by its own MOV straight from Uv3.y with no time term, so the
 * hologram slides horizontally and does not drift vertically -- hence rateV = 0
 * below. Both operands of the MAD are resolved uniform names rather than
 * literals, so this is a genuine time-driven scroll and not a masked zero, and
 * no shader constant is folded into the rate: the speed is purely `Speed * time`
 * and `Speed` is not recoverable from the SHO. Permutations #3-#6 (the fog-colour
 * variants of the same Ambient family) carry a structurally identical MAD, so the
 * U-only axis is the material's real behaviour rather than an artifact of #2.
 *
 * TODO: resolve `Speed` (#31182e0d) to a value via the engine's material setup
 *   to recover the intended rate; 0.05 below is a placeholder drift.
 */
export const hologram: MaterialFactory = {
  name: "hologram.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
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
