import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";
import { PAD_EMISSIVE_WEAPON, PAD_PULSE_DEPTH, PAD_PULSE_RATE, padEmissiveMap } from "./_pads";

/**
 * data/environments/*\/materials/weapon_pads.rcsmaterial
 *
 *   tex[0] Texture1  #3bdc0403  ds_weaponup_cs.gtf  diffuse
 *   tex[1] Texture2  #a2d555b9  ds_weaponup_ne.gtf  normal + emissive mask
 *   tex[2] lightmap  #37b5db58  lmaps/*-lmap.gtf
 *          W_Cycle   #ce5c4410  (no file)           emissive colour uniform
 *
 * The weapon pickup pads. The fragment program is short and unambiguous:
 *
 *   TEXR H0.xyz, f[TEX3], TEX0     ; Texture1 -> diffuse
 *   MULH H0.xyz, H1, H0            ; x the interpolated ambient/vertex colour
 *   TEXR H0.w,   f[TEX3], TEX1     ; Texture2 ALPHA -> the emissive mask
 *   MADH H0.xyz, H0.w, <W_Cycle>, H0   ; += mask * W_Cycle
 *
 * so the glow is Texture2's alpha channel tinted by `W_Cycle` and ADDED to the
 * lit diffuse. `ds_weaponup_ne.gtf`'s alpha is exactly that mask -- 85% clear
 * with a graded ramp over the symbol.
 *
 * `W_Cycle` ships no value (it is set per draw, and the engine cycles it), so
 * the colour and the pulse rate here are a viewer convention. See _pads.ts.
 *
 * Permutation: Static[5] of 70 -- the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 */
export const weapon_pads: MaterialFactory = {
  name: "weapon_pads.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    // The emissive comes from Texture2's ALPHA, not from the diffuse: binding
    // `map` here (as this factory used to) lit the whole pad instead of just
    // the symbol.
    const emissiveMap = padEmissiveMap(normalMap);
    return new PulsingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map } : {}),
        ...(normalMap ? { normalMap } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(emissiveMap ? { emissiveMap } : {}),
        emissive: new THREE.Color(PAD_EMISSIVE_WEAPON),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      PAD_PULSE_RATE,
      PAD_PULSE_DEPTH
    );
  },
};
