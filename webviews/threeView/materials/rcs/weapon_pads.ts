import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/weapon_pads.rcsmaterial
 *
 *   tex[0] Texture1  #3bdc0403  ds_weaponup_cs.gtf  diffuse
 *   tex[1] Texture2  #a2d555b9  ds_weaponup_ne.gtf  normal + emissive
 *   tex[2] lightmap  #37b5db58  lmaps/*-lmap.gtf
 *   tex[3] W_Cycle   #ce5c4410  (no file)           cycle uniform
 *
 * The weapon pickup pads. `W_Cycle` is a per-draw uniform the engine advances
 * to cycle the pad's symbol; with no file bound it is a constant here.
 *
 * Permutation: Static[5] of 70 -- the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: drive `W_Cycle` so the pad animates as it does in game.
 */
export const weapon_pads: MaterialFactory = {
  name: "weapon_pads.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { emissiveMap: map } : {}),
      emissive: new THREE.Color(0x2a4a6a),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
