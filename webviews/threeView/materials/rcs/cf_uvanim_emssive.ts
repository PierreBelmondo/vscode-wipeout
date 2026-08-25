import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/05_ubermall/materials/cf_uvanim_emssive.rcsmaterial
 *
 *   tex[0] Texture1                     mar_glowstrips.gtf, mr_rainbowstripes.gtf, dc_gradient.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine6-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf   -> lightMap
 *   tex[2] #87d769dc                    (no file)   -> map
 *   tex[3] #2481ef75                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 53, the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO. VP block @0x0069d0, FP
 *   block @0x005ec0.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the vertex program scrolls Texture1's UV on both axes from
 * `time` (c[467], hash #906b67ba), one MAD per axis, each with its own
 * per-axis speed uniform:
 *
 *     MOV R1.x, c467.xxxx                          ; R1.x = time
 *     MAD o7(TEX0).y, R1.xxxx, c465.xxxx, v1.yyyy   ; V' = time * rateV + V
 *     MAD o7(TEX0).x, R1.xxxx, c466.xxxx, v1.xxxx   ; U' = time * rateU + U
 *     ...
 *     TEXR H0.xyz, f[TEX0], TEX0                    ; sample at (U', V')
 *
 * c465.x (hash #2481ef75) is the V-axis rate and c466.x (hash #87d769dc) is
 * the U-axis rate; both are genuine per-permutation uniform reads (not
 * literals), so the true speeds are not recoverable from the SHO -- only
 * that both axes scroll, unlike the single-axis default in _animated.ts.
 */
export const cf_uvanim_emssive: MaterialFactory = {
  name: "cf_uvanim_emssive.rcsmaterial",
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
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.05,
      0.05,
    );
  },
};
