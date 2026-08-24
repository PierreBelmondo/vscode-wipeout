import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/02_track/materials/nr_twinblend.rcsmaterial
 *
 *   tex[0] #25c5c4d3                    animscaledballs.gtf   -> map
 *   tex[1] #d284858e                    glowbars_noisy.gtf   -> map
 *   tex[2] #8e6240ce                    assegai_landscape03.gtf, assegai_landscape03_glow.gtf, ag_square01cl_glow.gtf   -> emissiveMap
 *   tex[3] #176b1174                    assegai_landscape02.gtf, assegai_landscape02_glow.gtf, ag_square02cl_glow.gtf   -> unused
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
 * Animated: the shader takes the engine's `time` uniform and modulates the
 * emissive term with it, so the glow pulses (see _animated.ts).
 */
export const nr_twinblend: MaterialFactory = {
  name: "nr_twinblend.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, _unused3, lightMap] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
