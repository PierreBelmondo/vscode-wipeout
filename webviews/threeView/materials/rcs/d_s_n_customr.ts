import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/d_s_n_customr.rcsmaterial
 *
 *   tex[0] paraboloidReflectionTex #8365b1f3  ds_dualparaboloid_c.gtf
 *   tex[1] Texture1                #3bdc0403  ds_floorplain_wet_cs.gtf   diffuse
 *   tex[2] Texture2                #a2d555b9  ds_floorplain_waterleadin_n.gtf  normal
 *   tex[3] lightmap                #37b5db58  lmaps/*-lmap.gtf
 *
 * Diffuse + specular + normal + a *custom reflection*: the wet sections of the
 * track. The reflection is a dual-paraboloid environment map scaled by
 * `iblScalePower`, which is what makes standing water mirror the sky.
 *
 * Three.js has no dual-paraboloid sampler, so the reflection is approximated
 * with `envMap` -- the texture is laid out as two hemispheres side by side and
 * will not map exactly, but it puts reflected light of the right colour and
 * intensity on the surface.
 *
 * TODO: sample the paraboloid properly (front hemisphere from the left half,
 *   back from the right, selected on the sign of the reflected vector's z).
 *
 * Permutation: Static[7] of 70 -- the lit, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO.
 */
export const d_s_n_customr: MaterialFactory = {
  name: "d_s_n_customr.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [reflection, map, normalMap, lightMap] = textures;
    if (reflection) reflection.mapping = THREE.EquirectangularReflectionMapping;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(reflection ? { envMap: reflection, reflectivity: 0.35, combine: THREE.MixOperation } : {}),
      specular: new THREE.Color(0x555555),
      shininess: 60,
    });
  },
};
