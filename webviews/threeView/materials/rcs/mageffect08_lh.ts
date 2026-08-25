import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/amphiseum/materials/mageffect08_lh.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_wall01_cs.gtf   -> map
 *   tex[1] #1202d8df                    ds_wall_emiss_mask.gtf   -> map
 *   tex[2] Normal                       ds_wall01_rh_n.gtf   -> normalMap
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> emissiveMap (the scrolled channel)
 *   tex[4] lightmap                     ile_mesh_combine_tracksurface_07-lmap.gtf, ile_mesh_combine_tracksurface_09-lmap.gtf   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #220cf0e6                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 5, the Static backend's richest lit point -- directionalLight0
 *   + fogColour + constantAmbientColour + Normal + Colour + Wave, no shadow and
 *   no spot textures, i.e. the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). VP block @0x0062b0, FP block @0x006510. The
 *   others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the *vertex* program builds a UV from `time` (c464, hash
 * #906b67ba) and hands it to the fragment program on TEX6, which samples the
 * Wave texture with it:
 *
 *     ADD R2.x,        -v3.xxxx, c462.zzzz
 *     MUL R2.xy,        R2.xyxx, c463.xxxx    ; base coord scaled by a uniform
 *     ADD o13(TEX6).xy, R2.xyxx, c464.xxxx    ; + time, broadcast to U and V
 *     ...
 *     TEXR H7.xyz, f[TEX6], TEX3              ; Wave sampled at the scrolled UV
 *     MADH H6.y, -H6,   H7,   {1,0,0,0}.x
 *     MADH H6.w, -H6.x, H7.x, {1,0,0,0}.x
 *     MADH H1.x, -H6.z, H7.z, {1,0,0,0}.x
 *
 * `time` reaches TEX6 through the `.xxxx` swizzle on c464, so the same scalar
 * lands in both U and V: this is a uniform diagonal scroll, not an axis-specific
 * one, hence equal rateU and rateV below. No literal multiplies the time term --
 * the MUL against c463 is applied to the base coordinate before the ADD, and
 * c463 is a uniform, not a shader literal -- so there is no constant to carry
 * here the way ShieldMaterial carries its 3.0.
 *
 * The scrolled Wave sample is consumed by the MADH chain as a perturbation
 * folded into the lighting terms (H6/H1), which reads as a ripple travelling
 * over the wall rather than a pulse. (An earlier comment here claimed `time`
 * modulated the emissive term for a throbbing glow; the disassembly above shows
 * it does not, and the factory no longer uses PulsingMaterial.)
 *
 * TODO: the scroll happens in the vertex program, so the whole surface shares
 *   one animated coordinate set rather than the per-sample offset approximated
 *   here; and the Wave result feeds lighting, not emission -- routing it to
 *   `emissiveMap` is what a Phong material can express, not what the shader does.
 *
 * TODO: the per-axis rate. c463/c464 are uniforms the loader patches at run
 *   time, so the true speed is not recoverable from the SHO -- only that both
 *   axes move at the same rate.
 */
export const mageffect08_lh: MaterialFactory = {
  name: "mageffect08_lh.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, normalMap, wave, lightMap, _unused5, map2] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(normalMap ? { normalMap: normalMap } : {}),
        ...(wave ? { emissiveMap: wave, emissive: new THREE.Color(0xffffff) } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.05,
    );
  },
};
