import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/emissive_lights.rcsmaterial
 *
 *   tex[0] Emissive_Texture             colours_flashing_glow.gtf   -> emissiveMap
 *   tex[1] lightmap                     ile_mesh_combine21-lmap.gtf   -> lightMap
 *   tex[2] #f8f3ade0                    (no file)   -> map
 *   tex[3] #68292521                    (no file)   -> map
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
 * Animated: the shader takes the engine's `time` uniform and modulates the
 * emissive term with it, so the glow pulses (see _animated.ts).
 */
export const emissive_lights: MaterialFactory = {
  name: "emissive_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, lightMap, map, map1] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
