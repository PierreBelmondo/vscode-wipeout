import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/emissive_lights.rcsmaterial
 *
 *   tex[0] Emissive_Texture             colours_flashing_glow.gtf   -> emissiveMap
 *   tex[1] lightmap                     ile_mesh_combine21-lmap.gtf   -> lightMap
 *   tex[2] #f8f3ade0                    (no file)   -> map
 *   tex[3] #68292521                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: a V scroll, computed in the *vertex* program and interpolated down
 * as TEX3. Permutation idx 2 "Ambient" (RigidBody, no shadow/spot; VP at file
 * offset 001070, FP at file offset 001290):
 *
 *   VP uniform table:
 *     #68292521  U  ?                   c[463]  02010001
 *     #906b67ba  U  time                c[464]  02010001
 *
 *   VP code:
 *     001140+00d0: MOV o10(TEX3).x, v2.xxxx
 *     001170+0100: MOV R0.w, c463.xxxx
 *     001180+0110: MAD o10(TEX3).y, R0.wwww, c464.xxxx, v2.yyyy
 *
 *   FP code:
 *     0012e0+0050: MOVH H0.w, {0, 0, 0, Bloom}.x
 *     001300+0070: TEXR H0.xyz, f[TEX3], TEX0  ; END
 *
 * TEX3.x is v2.x passed through untouched; TEX3.y is v2.y + (c463 * time). The
 * single TEXR samples TEX0 -- Emissive_Texture -- at f[TEX3] with the default
 * `.xy` swizzle, so `time` moves only the second (V) coordinate of the emissive
 * lookup. Hence rateU = 0 and the emissive map is the channel that scrolls.
 *
 * There is no hardcoded literal multiplied into the time term here: the only
 * scale is c463 (#68292521), a hash-declared uniform the loader patches per
 * material rather than a baked-in number, so no separate scale constant is
 * introduced (contrast ShieldMaterial's literal 3.0). Its name did not resolve
 * and it cannot be read back from the SHO, so the rate below is the placeholder
 * drift described in _animated.ts.
 *
 * NOTE: an earlier revision of this file claimed the shader "modulates the
 * emissive term" with `time` and used PulsingMaterial. The disassembly above
 * shows a plain UV scroll and no emissive modulation at all; that claim was
 * wrong. Other uses of c464 in this SHO (offsets 005f60+ and later) were
 * checked and belong to different programs/permutations.
 *
 * TODO: recover c463 (#68292521) from the engine's material setup so the scroll
 *   runs at the real rate rather than the default.
 */
export const emissive_lights: MaterialFactory = {
  name: "emissive_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, lightMap, map, map1] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        // tex[0] is the channel the shader scrolls, and ScrollingMaterial
        // offsets emissiveMap along with map, so it moves as the shader does.
        ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      // V scrolls, U does not -- TEX3.y is the only component time reaches.
      0.0,
      0.05,
    );
  },
};
