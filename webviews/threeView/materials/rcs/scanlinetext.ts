import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/adverts/scanlinetext.rcsmaterial
 *
 *   tex[0] #fd669142                    leveltext_atoc.gtf   -> map
 *   tex[1] #576c4bf3                    startdarksideswatch.gtf, leveltext_atoc.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #658ff1b3                    (no file)   -> map
 *   tex[4] #05fec07d                    (no file)   -> map
 *   tex[5] #96d6cf20                    (no file)   -> map
 *   tex[6] #549310b8                    (no file)   -> map
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
 * Animated: a U-axis UV scroll built in the VERTEX program. Verified from
 * permutation idx=3 (Backend=Static, no Shadow/Spot textures bound,
 * VP@001440, FP@001610).
 *
 * VP @001440, uniform table:
 *   0014a0+0060: #9cc5ab3a  U  positionScale  c[466]  02030001
 *   001494+0054: #906b67ba  U  time           c[463]  02010001
 *   001488+0048: #549310b8  U  ?              c[464]  02010001
 * VP code:
 *   001540+0100: MOV o11(TEX4).y, v2.yyyy
 *   001570+0130: MOV R0.w, c464.xxxx
 *   0015b0+0170: MAD o11(TEX4).x, R0.wwww, c463.xxxx, v2.xxxx
 *
 * v2 is the Uv1 vertex attribute, so:
 *   o11(TEX4).x = c464 * time + v2.x   -- U is offset by scroll-speed * time
 *   o11(TEX4).y = v2.y                 -- V is the raw base UV, no time term
 *
 * FP @001610 then samples with that coordinate, plain x/y swizzle, no reorder,
 * so the .x above really is the horizontal component:
 *   0018c0+02b0: TEXR H2.xyzw, f[TEX4], TEX0
 *   001970+0360: TEXR H3.xyz,  f[TEX4], TEX1
 *
 * The identical MAD-into-o11(TEX4).x construct recurs verbatim in every VP
 * variant of this material that carries a `time` uniform (0x1a20, 0x20b0,
 * 0x22a0, 0x2d00, 0x3980, 0x4390, 0x4ee0, 0x50d0), always writing only .x
 * while .y stays a plain MOV from v2.yyyy. No permutation was found where
 * time reaches the V component, and none multiplies time into a colour or
 * emissive term -- it only ever enters a texcoord register consumed by TEXR.
 *
 * There is no literal scale to apply: the multiplier c464 (#549310b8) is
 * itself an unnamed per-material uniform the loader patches at run time, not
 * an inline constant like the 3.0 in ShieldMaterial's MADR, so
 * ScrollingMaterial's default drift rate stands in for it on the U axis only.
 *
 * (Previously this factory took ScrollingMaterial's rateU=0/rateV=0.05
 * default and scrolled V, which the trace above contradicts.)
 */
export const scanlinetext: MaterialFactory = {
  name: "scanlinetext.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05, // rateU: U is the scrolled axis per the VP trace
      0, // rateV: V is the raw base UV, untouched by time
    );
  },
};
