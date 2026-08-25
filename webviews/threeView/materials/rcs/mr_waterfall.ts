import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/05_ubermall/materials/mr_waterfall.rcsmaterial
 *
 *   tex[0] #79e83d3a                    martin_waterfallspray_alphablend.gtf, martin_miniwaterfall_alphablend.gtf, martin_waterfall_alphablend.gtf   -> map
 *   tex[1] Diffuse                      martin_waterfall_alphablend.gtf, martin_miniwaterfall_alphablend.gtf   -> map
 *   tex[2] Emissive                     and_waterhighlights_add.gtf   -> emissiveMap
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #1e60d8ff                    (no file)   -> map
 *   tex[5] #b1c99535                    (no file)   -> map
 *   tex[6] #7d149b4d                    (no file)   -> map
 *   tex[7] #de421de4                    (no file)   -> map
 *   tex[8] #9422a805                    (no file)   -> map
 *   tex[9] #3b8be5cf                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: the falling water scrolls on *both* axes. Unusually for this family
 * the scroll is computed in the vertex program, not the fragment program --
 * VP@0x001c40 (crc=7e8bb558) builds TEX3 from `time` and hands the fragment
 * program a coordinate that is already moving:
 *
 *     MOV R0.w, c463.xxxx                          ; R0.w = time  (c463 = #906b67ba)
 *     MAD o10(TEX3).y, R0.wwww, c460.xxxx, v2.yyyy ; V = time * c460 + Uv4.y
 *     MAD o10(TEX3).x, R0.wwww, c461.xxxx, v2.xxxx ; U = time * c461 + Uv4.x
 *     MOV o10(TEX3).zw, v8.xxxy                    ; TEX3.zw = static
 *
 * and FP@0x001e20 (crc=300d9732) samples with it:
 *
 *     TEXR H0.w, f[TEX3], TEX0    ; t[0] at the scrolled xy
 *     TEXR H1.w, R0.zwzz, TEX1    ; Emissive at TEX3.zw -- static, not scrolled
 *
 * So only `map` moves; the emissive highlights are pinned to the geometry.
 * ScrollingMaterial offsets emissiveMap along with map, which is one channel
 * more than the shader does -- see the TODO below.
 *
 * There is no literal multiplier to carry across (contrast ShieldMaterial's
 * 3.0): the two axes are scaled by separate unnamed constant registers, c461
 * for U and c460 for V, which the loader patches at run time and which are not
 * recoverable from the SHO. Both rates are therefore the house default drift,
 * and the only fact the disassembly fixes is that *both* axes move.
 *
 * `time` also appears in the fragment program's constant listing, but it is
 * never actually read: every FP mention across all 21 permutations is
 * `MADR R0.y, R0.x, {?, constantAmbientColour, time, ?}.x, R0.w` -- the `.x`
 * swizzle selects word[0] (the unnamed #7d149b4d), not word[2] (time). Checked
 * against a grep of the full dump; the animation is vertex-stage only.
 *
 * Permutation: idx 3, Static backend -- the richest lit no-shadow/no-spot point
 *   of the matrix (Diffuse + Emissive + directionalLight0 + fog +
 *   constantAmbient + time; see _abstract.ts). The others are TODO. Permutation
 *   idx 2 (Ambient, VP@0x0018f0) uses the identical c463/c460/c461 MAD sequence.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: the emissive highlights should stay still while the diffuse scrolls.
 *   ScrollingMaterial moves every channel it finds, so that would need either a
 *   second offset track or a ShaderMaterial.
 */
export const mr_waterfall: MaterialFactory = {
  name: "mr_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        ...(map6 ? { map: map6 } : {}),
        ...(map7 ? { map: map7 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05, // rateU: U scrolls too -- MAD on o10(TEX3).x, scaled by c461
      0.05, // rateV: MAD on o10(TEX3).y, scaled by c460
    );
  },
};
