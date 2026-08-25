import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/outerstripeseffect.rcsmaterial
 *
 *   tex[0] Colour                       feisargreen.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #549310b8                    (no file)   -> map
 *   tex[3] #2b5b251d                    (no file)   -> map
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
 * Animated: a U-axis UV scroll built in the VERTEX program, not an emissive
 * pulse. Verified from permutation idx=3 (Backend=Static, VP@001620,
 * FP@0017f0) and re-checked against idx=6 (VP@002460, same FP@0017f0), the
 * two plainest lit Static permutations with no shadow/spot textures bound.
 *
 * VP @001620, uniform table:
 *   001668+0048: #549310b8  U  ?      c[464]  02010001
 *   001674+0054: #906b67ba  U  time   c[463]  02010001
 * VP code:
 *   001750+0130: MOV R0.w, c464.xxxx
 *   001790+0170: MAD o11(TEX4).x, R0.wwww, c463.xxxx, v2.xxxx
 *
 * VP @002460 has the identical construct, so the pattern is not incidental:
 *   002550+00f0: MOV o11(TEX4).y, v2.yyyy
 *   002570+0110: MOV R1.x, c464.xxxx
 *   0025a0+0140: MAD o11(TEX4).x, R1.xxxx, c463.xxxx, v2.xxxx
 *
 * v2 is the Uv1 vertex attribute (#427214fc A Uv1 v[2]), so:
 *   o11(TEX4).x = c464 * time + v2.x   -- U is offset by scroll-speed * time
 *   o11(TEX4).y = v2.y                 -- V is the raw base UV, no time term
 *
 * FP @0017f0 then samples the Colour texture with that scrolled coordinate:
 *   0018b0+00c0: MOVR R1.xyzw, f[TEX1]
 *   0019d0+01e0: TEXR H0.xyz, f[TEX4], TEX0
 *
 * so the stripe texture slides along U. There is no literal scale to apply:
 * the multiplier c464 (#549310b8) is itself an unnamed per-material uniform
 * the loader patches at run time, not an inline constant like the 3.0 in
 * ShieldMaterial's MADR, so ScrollingMaterial's default drift rate stands in
 * for it on the U axis only.
 */
export const outerstripeseffect: MaterialFactory = {
  name: "outerstripeseffect.rcsmaterial",
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
      0.05, // rateU: U is the scrolled axis per the VP trace
      0, // rateV: V is the raw base UV, untouched by time
    );
  },
};
