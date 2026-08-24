import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/02_track/materials/sourcerpulse.rcsmaterial
 *
 *   tex[0] #28e981a4                    sourcerplasmavibea.gtf   -> map
 *   tex[1] Wave                         ds_wave_c.gtf   -> unused
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #e8a23c93                    (no file)   -> map
 *   tex[4] #220cf0e6                    (no file)   -> map
 *   tex[5] #7961a57f                    (no file)   -> map
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
export const sourcerpulse: MaterialFactory = {
  name: "sourcerpulse.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, _unused1, lightMap, map1, map2, map3] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
