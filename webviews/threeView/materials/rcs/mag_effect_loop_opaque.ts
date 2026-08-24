import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/mag_effect_loop_opaque.rcsmaterial
 *
 *   tex[0] #1202d8df                    mag_emiss_floor_seethru_talons.gtf   -> map
 *   tex[1] #cc98c527                    dc_iridescent_gradient.gtf   -> map
 *   tex[2] Texture2                     glass_etched_tech.gtf   -> map
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> unused
 *   tex[4] lightmap                     (no file)   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #6c57ba63                    (no file)   -> map
 *   tex[7] #e93dfe2c                    (no file)   -> map
 *   tex[8] #81e0e773                    (no file)   -> map
 *   tex[9] #220cf0e6                    (no file)   -> map
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
export const mag_effect_loop_opaque: MaterialFactory = {
  name: "mag_effect_loop_opaque.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, _unused3, lightMap, _unused5, map3, map4, map5, map6] = textures;
    return new PulsingMaterial({
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
