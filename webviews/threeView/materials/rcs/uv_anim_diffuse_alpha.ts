import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/uv_anim_diffuse_alpha.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              air_traffic_test_a_atoc.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #33d51367                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2, the lit, Ambient, Static-backend, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). VP block @0x001090, FP block
 *   @0x001230. The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the vertex program scrolls Uv1 along U only, from `time`
 * (c[464], hash #906b67ba), with a per-material speed uniform in c[463]:
 *
 *     0010b0+0020:  #b9d31b0a  A  position    v[0]
 *     0010a8+0018:  #427214fc  A  Uv1         v[2]
 *     0010cc+003c:  #33d51367  U  ?           c[463]  02010001
 *     0010e4+0054:  #906b67ba  U  time        c[464]  02010001
 *     001160+00d0:  MOV o10(TEX3).y, v2.yyyy               ; V' = Uv1.y, untouched
 *     001170+00e0:  MOV R0.w, c463.xxxx                    ; R0.w = scroll speed
 *     0011a0+0110:  MAD o10(TEX3).x, R0.wwww, c464.xxxx, v2.xxxx
 *                                                          ; U' = speed * time + Uv1.x
 *
 * and the fragment program samples the diffuse map at that scrolled varying:
 *
 *     001280+0050:  TEXR H0.xyzw, f[TEX3], TEX0            ; Diffuse_Texture at (U', V)
 *
 * so only the U axis moves; TEX3.y carries the static Uv1.y with no time term,
 * hence rateV is 0 below. Permutation idx 3/5 (VP @0x0012d0, FP @0x0014a0)
 * shows the identical MOV/MOV/MAD/TEXR pattern.
 *
 * There is no literal multiplier in the MAD -- the scroll factor is c463.x
 * (hash #33d51367), a genuine per-material uniform read (category U, binding
 * metadata 02010001), not a folded constant, so the true speed is not
 * recoverable from the SHO and the rate below is a placeholder drift.
 *
 * This shader contains no emissive-pulse instruction: `time` only ever feeds
 * the UV MAD into TEX3, which is immediately sampled by TEXR. The uniform
 * tables for permutations 1/2/3/5/7/8/9/10/11 were all checked and every one
 * binds #906b67ba consistently with this UV scroll; none feeds it into a colour
 * or emissive computation. (An earlier version of this factory claimed an
 * emissive pulse via PulsingMaterial -- that was wrong.)
 *
 * TODO: resolve #33d51367 to a friendly name via scripts/hashes.ts
 *   (candidates: uvScrollSpeed, scrollSpeedU, uvVelocity) to recover the
 *   intended speed.
 */
export const uv_anim_diffuse_alpha: MaterialFactory = {
  name: "uv_anim_diffuse_alpha.rcsmaterial",
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
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      0.05,
      0.0,
    );
  },
};
