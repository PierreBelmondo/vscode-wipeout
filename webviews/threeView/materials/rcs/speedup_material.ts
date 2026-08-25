import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";
import { PAD_EMISSIVE_SPEED, PAD_PULSE_DEPTH, PAD_PULSE_RATE, padEmissiveMap } from "./_pads";

/**
 * data/environments/*\/materials/speedup_material.rcsmaterial
 *
 *   tex[0] Texture1  #3bdc0403  ds_speedup_cs.gtf   diffuse
 *   tex[1] Texture2  #a2d555b9  ds_speedup_ne.gtf   normal + emissive mask
 *   tex[2] lightmap  #37b5db58  lmaps/*-lmap.gtf
 *          Colour    #02ab9f07  (no file)           emissive colour uniform
 *
 * The boost pads on the track surface. The fragment program matches the weapon
 * pads' exactly — diffuse x ambient, then `Texture2.alpha * Colour` added on
 * top — with `Colour` in place of `W_Cycle`:
 *
 *   TEXR H0.xyz, R0.zwzz, TEX0
 *   MULH H0.xyz, H0, <constantAmbientColour>
 *   TEXR H0.w,   R0.zwzz, TEX1        ; the mask
 *   MADH H0.xyz, H0.w, <Colour>, H0
 *
 * `ds_speedup_ne.gtf`'s alpha is 92% clear with 6% fully opaque — the arrows.
 *
 * See _pads.ts for why the colour and rate are a viewer convention.
 *
 * Permutation: Static[5] of 70 -- the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 */
export const speedup_material: MaterialFactory = {
  name: "speedup_material.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    const emissiveMap = padEmissiveMap(normalMap);
    return new PulsingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map } : {}),
        ...(normalMap ? { normalMap } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(emissiveMap ? { emissiveMap } : {}),
        emissive: new THREE.Color(PAD_EMISSIVE_SPEED),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      PAD_PULSE_RATE,
      PAD_PULSE_DEPTH
    );
  },
};
