import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/basic_uv_scroll.rcsmaterial
 *
 *   tex[0] Texture1                     orange_emissive.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_05-lmap.gtf, ile_mesh_combine_track02_016-lmap.gtf, ile_mesh_combine_track03_05-lmap.gtf   -> lightMap
 *   tex[2] #1abbe1f7                    (no file)   -> map
 *   tex[3] #9c2f9359                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts) -- Texture1 + directionalLight0 + fogColour +
 *   constantAmbientColour. The others are TODO. VP block @0x1670, FP block
 *   @0x1850.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the vertex program scrolls Texture1's UV on both axes from `time`
 * (c[463], hash #906b67ba), one MAD per axis, each with its own per-axis speed
 * uniform:
 *
 *     MOV R0.w, c463.xxxx                           ; R0.w = time
 *     MAD o11(TEX4).y, R0.wwww, c462.xxxx, v2.yyyy  ; V' = time * rateV + Uv1.y
 *     MAD o11(TEX4).x, R0.wwww, c464.xxxx, v2.xxxx  ; U' = time * rateU + Uv1.x
 *
 * and the fragment program then samples Texture1 at that scrolled varying:
 *
 *     TEXR H4.xyz, f[TEX4], TEX0                    ; Texture1 (t[0]) at (U', V')
 *
 * so the whole base texture slides across the surface -- a flowing pattern, not
 * a brightness change. There is no second sampler and no emissive term driven
 * by `time`.
 *
 * c462.x (hash #9c2f9359) is the V-axis rate and c464.x (hash #1abbe1f7) is the
 * U-axis rate. Both are declared per-material uniform reads (category U,
 * size 1), not literals, so no shader constant is folded into the rates below
 * and the true speeds are not recoverable from the SHO -- only that both axes
 * scroll. The same MAD pair appears in every permutation that declares `time`
 * (idx 2,3,4,5,6,7,8), so this is the material's real behaviour rather than an
 * artifact of one permutation.
 *
 * TODO: resolve #9c2f9359 / #1abbe1f7 to friendly names via scripts/hashes.ts
 *   (candidates: uvScrollSpeed, scrollSpeedU / scrollSpeedV, uvVelocity) to
 *   recover the intended speeds.
 */
export const basic_uv_scroll: MaterialFactory = {
  name: "basic_uv_scroll.rcsmaterial",
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
