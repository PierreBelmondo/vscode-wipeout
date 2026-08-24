import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/and_anim_spec.rcsmaterial
 *
 *   tex[0] DiffuseTexture               and_newdome_darklittlepatch.gtf   -> map
 *   tex[1] #b1f2a176                    and_lightstrip_03_e.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #5710904f                    (no file)   -> map
 *   tex[5] #78787596                    (no file)   -> map
 *   tex[6] #48ca4e3e                    (no file)   -> map
 *   tex[7] #e8bcd7f5                    (no file)   -> map
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
export const and_anim_spec: MaterialFactory = {
  name: "and_anim_spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3, map4, map5] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
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
