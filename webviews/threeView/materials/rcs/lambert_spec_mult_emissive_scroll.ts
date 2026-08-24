import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/lambert_spec_mult_emissive_scroll.rcsmaterial
 *
 *   tex[0] #75ccafc8                    gradient_firey_01.gtf   -> map
 *   tex[1] #b1f2a176                    track_rail_03_emissive.gtf   -> emissiveMap
 *   tex[2] Texture1                     track_rail_03_colour_spec.gtf   -> specularMap
 *   tex[3] lightmap                     ile_mesh_combine_track01_04-lmap.gtf, ile_mesh_combine_track03_03-lmap.gtf, ile_mesh_combine_track03_04-lmap.gtf   -> lightMap
 *   tex[4] #6d0178af                    (no file)   -> map
 *   tex[5] #7611a2d8                    (no file)   -> map
 *   tex[6] #03e55ee0                    (no file)   -> map
 *   tex[7] #d5814b74                    (no file)   -> map
 *   tex[8] #8ed32c39                    (no file)   -> map
 *   tex[9] #15438bf0                    (no file)   -> map
 *   tex[10] #381a1581                    (no file)   -> map
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
export const lambert_spec_mult_emissive_scroll: MaterialFactory = {
  name: "lambert_spec_mult_emissive_scroll.rcsmaterial",
  minTextures: 1,
  maxTextures: 11,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, specularMap, lightMap, map1, map2, map3, map4, map5, map6, map7] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
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
