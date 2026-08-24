import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/02_track/materials/nr_splitrgbscreen.rcsmaterial
 *
 *   tex[0] DiffuseTexture               tigron_slum.gtf, piranha_red_glow.gtf   -> map
 *   tex[1] #97b6f446                    animgradient_wibble.gtf   -> map
 *   tex[2] #57ff03d1                    animgradient_wibble.gtf   -> map
 *   tex[3] #87245dca                    verticaltubes.gtf   -> map
 *   tex[4] lightmap                     (no file)   -> lightMap
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
export const nr_splitrgbscreen: MaterialFactory = {
  name: "nr_splitrgbscreen.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, map3, lightMap] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
