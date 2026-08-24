import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/02_track/materials/nr_billboardholographicscanlines.rcsmaterial
 *
 *   tex[0] #6f469b89                    static_ad_landscape05.gtf, static_ad_landscape03.gtf, static_ad_landscape01.gtf   -> map
 *   tex[1] #dd7ec609                    hologramscanlines.gtf, and_line_rgb_clouds_alpha.gtf, mr_pearl_spec.gtf   -> specularMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #fad8b460                    smoke.gtf, and_verticalemissive.gtf, dc_gradient_noise.gtf   -> map
 *   tex[4] #4f2aef81                    (no file)   -> map
 *   tex[5] #088b2c6a                    (no file)   -> map
 *   tex[6] #ef6e4697                    (no file)   -> map
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
export const nr_billboardholographicscanlines: MaterialFactory = {
  name: "nr_billboardholographicscanlines.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2, map3, map4] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
