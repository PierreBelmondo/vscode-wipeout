import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/speedup_material.rcsmaterial
 *
 *   tex[0] Texture1  #3bdc0403  ds_speedup_cs.gtf   diffuse
 *   tex[1] Texture2  #a2d555b9  ds_speedup_ne.gtf   normal + emissive
 *   tex[2] lightmap  #37b5db58  lmaps/*-lmap.gtf
 *   tex[3] Colour    #02ab9f07  (no file)           tint uniform
 *
 * The boost pads on the track surface. `Colour` is a per-draw uniform rather
 * than a texture, which the engine drives to flash the pad; the arrows glow
 * through the `_ne` map's alpha.
 *
 * Permutation: Static[5] of 70 -- the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: animate `Colour`. The pad pulses in game and is static here.
 */
export const speedup_material: MaterialFactory = {
  name: "speedup_material.rcsmaterial",
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
      emissive: new THREE.Color(0x3a5a7a),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
