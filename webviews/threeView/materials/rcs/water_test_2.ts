import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/water_test_2.rcsmaterial
 *
 *   tex[0] ?  waves2.gtf
 *   tex[1]    lightmap
 *   Colour        (0.000, 0.553, 0.592)  teal
 *   Reflectivity  (0.155, 0.155, 0.155)
 *
 * Brighter, more saturated water than water_noref — a lagoon rather than open
 * sea. The Colour constant is applied as the material tint.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const water_test_2: MaterialFactory = {
  name: "water_test_2.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [waves, lightMap] = textures;
    return new WaterMaterial({
      side: THREE.DoubleSide,
      ...(waves ? { map: waves } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      color: new THREE.Color(0x008d97),
      reflectivity: 0.155,
      specular: new THREE.Color(0x888888),
      shininess: 60,
      transparent: true,
      opacity: 0.85,
    });
  },
};
