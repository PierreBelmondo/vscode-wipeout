import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/05_ubermall/materials/mr_waterfall.rcsmaterial
 *
 *   tex[0] #79e83d3a                    martin_waterfallspray_alphablend.gtf, martin_miniwaterfall_alphablend.gtf, martin_waterfall_alphablend.gtf   -> map
 *   tex[1] Diffuse                      martin_waterfall_alphablend.gtf, martin_miniwaterfall_alphablend.gtf   -> map
 *   tex[2] Emissive                     and_waterhighlights_add.gtf   -> emissiveMap
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #1e60d8ff                    (no file)   -> map
 *   tex[5] #b1c99535                    (no file)   -> map
 *   tex[6] #7d149b4d                    (no file)   -> map
 *   tex[7] #de421de4                    (no file)   -> map
 *   tex[8] #9422a805                    (no file)   -> map
 *   tex[9] #3b8be5cf                    (no file)   -> map
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
export const mr_waterfall: MaterialFactory = {
  name: "mr_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
