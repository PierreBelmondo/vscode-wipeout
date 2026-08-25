import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/cf_constantcolourglow_ramp_03.rcsmaterial
 *
 *   tex[0] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #1c96b9d6                    smoke.gtf   -> map
 *   tex[3] #6d0178af                    (no file)   -> map
 *   tex[4] #bbe42ccd                    (no file)   -> map
 *   tex[5] #68d512e9                    (no file)   -> map
 *   tex[6] #8f3d0b43                    (no file)   -> map
 *   tex[7] #e0dcab49                    (no file)   -> map
 *   tex[8] #5963a112                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx=2 "Ambient" (Backend=Static, no shadow/spot) -- the lit,
 *   Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts). VP
 *   block @0x0014b0, FP block @0x001690. The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: despite the "constantcolourglow" name, `time` does not modulate a
 * glow term here. It scrolls the primary map's V coordinate in the *vertex*
 * program, and the fragment program samples TEX0 at that interpolator.
 *
 *   VP uniform table (block crc=44172de7):
 *     0014e0+0030: #2e7d5f33  U  viewProj      c[256]
 *     00151c+006c: #906b67ba  U  time          c[463]  02010001
 *
 *   VP code:
 *     0015a0+00f0: MOV R0.z, c463.xxxx                     ; R0.z = time
 *     0015c0+0110: MUL R0.xy, v2.xyxx, c462.xxxx
 *     0015d0+0120: MOV o10(TEX3).zw, R0.xxxy               ; TEX3.zw static
 *     0015f0+0140: MUL R0.z, R0.zzzz, c464.xxxx            ; time * rate
 *     001600+0150: MAD o10(TEX3).y, v2.yyyy, c461.xxxx, -R0.zzzz
 *     001590+00e0: MOV o10(TEX3).x, v2.xxxx                ; TEX3.x = uv.x
 *
 *   FP code (block crc=802a82d3):
 *     001730+00a0: TEXR H0.x, f[TEX3], TEX0                ; (u static, v scrolled)
 *     001750+00c0: TEXR R0.y, f[TEX3].zwzz, TEX1           ; TEX3.zw, no time
 *
 * So TEX3.x is the untouched uv.x and TEX3.y is `uv.y * c461 - time * c464`:
 * exactly one axis moves, V, and it moves *backwards* (the MAD subtracts the
 * time term), hence the negative rateV below and rateU = 0. The second sample
 * (TEX1, via TEX3.zw) is static.
 *
 * `time` is consumed only by the vertex program in this permutation; the four
 * inline FP constant quads (code offsets 0x10, 0x40, 0xb0, 0xd0, 0x100, 0x120,
 * 0x150, 0x180) were checked against the preamble's patch-site table (patch
 * offsets 0x28, 0x2c/time, 0x30, 0x34) and none of them is a patch site, so
 * they are genuine zeroes rather than a mis-printed clock.
 *
 * The scale factor c464 is itself a uniform (#68d512e9, name unresolved by the
 * hashes db), not a literal, so unlike ShieldMaterial's 3.0 there is no shader
 * constant to apply explicitly -- the real speed is authored per-material and
 * cannot be read back from the SHO. See ScrollingMaterial's own TODO.
 *
 * TODO: permutations idx 7, 9, 11 (the fuller lit-with-zone-fog variants)
 *   declare `time` on both the VP and FP sides and would need tracing
 *   separately if one of them turns out to be the one actually drawn.
 */
export const cf_constantcolourglow_ramp_03: MaterialFactory = {
  name: "cf_constantcolourglow_ramp_03.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        ...(map6 ? { map: map6 } : {}),
        ...(map7 ? { map: map7 } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.0,
      -0.05,
    );
  },
};
