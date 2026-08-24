import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_mult_scroll.rcsmaterial
 *
 *   tex[0] Emissive                     bluewhite_band_colour_scroll.gtf   -> emissiveMap
 *   tex[1] Texture1                     bluewhite_band_colour_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_05-lmap.gtf, ile_mesh_combine_track03_05-lmap.gtf   -> lightMap
 *   tex[3] #6d0178af                    (no file)   -> map
 *   tex[4] #464ac094                    (no file)   -> map
 *   tex[5] #8ed32c39                    (no file)   -> map
 *   tex[6] #05fec07d                    (no file)   -> map
 *   tex[7] #549310b8                    (no file)   -> map
 *   tex[8] #1b83fd49                    (no file)   -> map
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
export const lambert_spec_mult_scroll: MaterialFactory = {
  name: "lambert_spec_mult_scroll.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, specularMap, lightMap, map, map1, map2, map3, map4, map5] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
