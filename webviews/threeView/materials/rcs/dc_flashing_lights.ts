import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/dc_flashing_lights.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_ringtracersdiffuse.gtf   -> map
 *   tex[1] #b1f2a176                    dc_grad.gtf, dc_grad_b.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine22-lmap.gtf, ile_mesh_combine23-lmap.gtf   -> lightMap
 *   tex[3] #e8bcd7f5                    (no file)   -> map
 *   tex[4] #3fcae4b3                    (no file)   -> map
 *   tex[5] #d1634606                    (no file)   -> map
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
export const dc_flashing_lights: MaterialFactory = {
  name: "dc_flashing_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
