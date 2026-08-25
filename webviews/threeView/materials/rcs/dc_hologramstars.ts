import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/dc_hologramstars.rcsmaterial
 *
 *   tex[0] #b1f2a176                    dc_stars.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #5beb1759                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx=2 "Ambient" (Backend=Static, FP at 0x16d0, no shadow, no
 *   spot) -- the lit, Ambient, no-shadow, no-spot point of the matrix (see
 *   _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the scroll happens in the *vertex* program, which offsets the V
 * coordinate by `time` before handing it to the fragment stage. In the Ambient
 * permutation's VP (0x1570) the constants are c463 = per-material scroll speed
 * (#5beb1759), c464 = `time` (#906b67ba):
 *
 *     001630+00c0: MOV R0.w, c463.xxxx
 *     001660+00f0: MAD o8(TEX1).w, R0.wwww, -c464.xxxx, v2.yyyy
 *                                  ; TEX1.w = Uv1.y - speed * time
 *
 * and the FP (0x16d0) samples with that varying as the second coordinate:
 *
 *     001710+0040: MOVR R0.y, f[TEX1].w   ; scrolled V
 *     001720+0050: MOVR R0.x, f[TEX0].w   ; static U
 *     001730+0060: TEXR H0.xyzw, R0, TEX0
 *
 * The simpler idx=1 "ZAlphaOnly" permutation (VP 0x1400) does the same with the
 * roles shifted one slot -- c464 = speed, c465 = `time`:
 *
 *     0014c0+00c0: MOV R0.w, c464.xxxx
 *     001500+0100: MAD o7(TEX0).y, R0.wwww, -c465.xxxx, v1.yyyy
 *
 * so only the V (y) axis moves; U is passed through untouched. Hence rateU = 0.
 * The MAD negates the time term, so the offset runs in -V; the rate is passed
 * negative to match. There is no literal multiplier on the time term in any of
 * the 21 permutations -- the speed is the per-material uniform #5beb1759, whose
 * value the loader patches at run time and which the SHO does not record, so
 * the magnitude below is still a guess even though the axis and sign are not.
 */
export const dc_hologramstars: MaterialFactory = {
  name: "dc_hologramstars.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map1 ? { map: map1 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0,
      -0.05,
    );
  },
};
