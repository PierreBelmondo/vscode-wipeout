import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/animhexlights.rcsmaterial
 *
 *   tex[0] Texture1                     dc_losenge.gtf, dc_hexgrid.gtf   -> map
 *   tex[1] #dba0a35a                    dc_gradient_c.gtf   -> map (animated)
 *   tex[2] lightmap                     ile_mesh_combine_track02_04-lmap.gtf, ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] #ef18f362                    (no file)   -> map
 *   tex[5] #31182e0d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: a U scroll, computed in the *vertex* program and interpolated down
 * as TEX4. Permutation idx 3 (Static, no shadow/spot; VP off=001e60,
 * FP off=002030):
 *
 *     ; VP uniforms: #31182e0d U Speed c[463]; #906b67ba U time c[464]
 *     MOV o11(TEX4).yzw, v8.wwxy       ; V and the second coord pair, static
 *     MOV R0.w, c463.xxxx              ; Speed
 *     MAD o11(TEX4).x, R0.wwww, c464.xxxx, v8.zzzz  ; U' = Speed * time + U
 *
 *     ; FP attrs: #3bdc0403 A Texture1 t[0]; #dba0a35a A ? t[1]
 *     TEXR H5.xyz, f[TEX4], TEX1       ; tex[1] at (U', V)  <- moves
 *     TEXR H4.xyz, f[TEX4].zwzz, TEX0  ; tex[0] at (TEX4.z, TEX4.w)  <- static
 *
 * Only TEX4.x is touched by `time`, so only the first (U) coordinate scrolls,
 * and only for tex[1] (#dba0a35a), which samples with the default `.xy` swizzle.
 * The Texture1 lookup reads `.zwzz` -- TEX4.z/.w, both copied straight from
 * v8.w/v8.x -- so Texture1 is *not* animated. Hence rateV = 0.
 *
 * There is no hardcoded literal multiplied into the time term here: the only
 * scale is the `Speed` uniform (c463), which the loader patches per material
 * and which cannot be read back from the SHO, so the rate below is the
 * placeholder drift described in _animated.ts.
 *
 * NOTE: an earlier revision of this file claimed the shader "modulates the
 * emissive term" and used PulsingMaterial. The disassembly above shows a UV
 * scroll and no emissive modulation at all; that claim was wrong.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: recover `Speed` (c463) from the engine's material setup so the scroll
 *   runs at the real rate rather than the default.
 */
export const animhexlights: MaterialFactory = {
  name: "animhexlights.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        // tex[1] is the one the shader scrolls, so it is the `map` that wins:
        // ScrollingMaterial only offsets the channel it ends up holding.
        ...(map1 ? { map: map1 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      // U scrolls, V does not -- TEX4.x is the only component time reaches.
      0.05,
      0.0,
    );
  },
};
