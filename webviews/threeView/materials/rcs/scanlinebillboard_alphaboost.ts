import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/scanlinebillboard_alphaboost.rcsmaterial
 *
 *   tex[0] #6f469b89                    billboard5.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf   -> map
 *   tex[4] #90bd163f                    (no file)   -> map
 *   tex[5] #464ac094                    (no file)   -> map
 *   tex[6] #08a111e3                    (no file)   -> map
 *   tex[7] #5895bced                    (no file)   -> map
 *   tex[8] #0942573b                    (no file)   -> map
 *   tex[9] #d09c054d                    (no file)   -> map
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
export const scanlinebillboard_alphaboost: MaterialFactory = {
  name: "scanlinebillboard_alphaboost.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      ...(map8 ? { map: map8 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
