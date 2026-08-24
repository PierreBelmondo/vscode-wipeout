import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/animating_traffic.rcsmaterial
 *
 *   tex[0] #fd669142                    traffic_atoc.gtf   -> map
 *   tex[1] #576c4bf3                    trafficspec_atoc.gtf   -> map
 *   tex[2] Texture1                     traffic_emmisive_atoc.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #05fec07d                    (no file)   -> map
 *   tex[6] #549310b8                    (no file)   -> map
 *   tex[7] #1ead5c60                    (no file)   -> map
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
 * Animated: the shader takes the engine's `time` uniform and offsets the
 * sample coordinate with it, so the texture channels scroll (see _animated.ts).
 */
export const animating_traffic: MaterialFactory = {
  name: "animating_traffic.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
