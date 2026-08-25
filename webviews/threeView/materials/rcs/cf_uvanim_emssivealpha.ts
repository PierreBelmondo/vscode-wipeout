import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/cf_uvanim_emssivealpha.rcsmaterial
 *
 *   tex[0] Texture1                     mar_orangeglowstrip1.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine4-lmap.gtf   -> lightMap
 *   tex[2] #87d769dc                    (no file)   -> map
 *   tex[3] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 53, the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO. VP block @0x0067e0, FP
 *   block @0x005d50.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the scroll happens in the *vertex* program, not the fragment
 * program. `time` (c[467], hash #906b67ba) is read once and reused for both
 * texcoord components, each scaled by its own per-axis speed uniform:
 *
 *     MOV R1.x, c467.xxxx                          ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy  ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c466.xxxx, v1.xxxx  ; U' = time * rateU + U
 *
 * and the fragment program is a single unconditional sample of that varying:
 *
 *     TEXR H0.xyzw, f[TEX0], TEX0                  ; Texture1 at (U', V')
 *
 * so both axes scroll independently and the whole base texture slides across
 * the surface. Texture1 is the only sampler bound in this permutation, and
 * there is no per-pixel time term -- no pulse, no second interfering sample.
 *
 * c465.x (hash #2481ef75) is the V-axis rate and c466.x (hash #87d769dc) is
 * the U-axis rate. Both are declared per-material uniform reads (category U,
 * size 1) that the disassembler could not resolve to friendly names, not
 * literals -- so no shader constant is folded into the rates below, and the
 * true speeds are not recoverable from the SHO. Only the fact that both axes
 * scroll is known; the rates here are the house default drift.
 *
 * TODO: resolve #2481ef75 / #87d769dc to friendly names via scripts/hashes.ts
 *   (candidates: uvScrollSpeed, scrollSpeedU / scrollSpeedV, uvVelocity) to
 *   recover the intended speeds.
 */
export const cf_uvanim_emssivealpha: MaterialFactory = {
  name: "cf_uvanim_emssivealpha.rcsmaterial",
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
      0.05,
    );
  },
};
