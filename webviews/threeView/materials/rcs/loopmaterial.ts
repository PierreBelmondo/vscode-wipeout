import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/loopmaterial.rcsmaterial
 *
 *   tex[0] #dd7ec609                    mar_aimee_holo.gtf, loopeffect_red.gtf, loopeffect.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track02_01-lmap.gtf   -> lightMap
 *   tex[2] #fad8b460                    smoke.gtf   -> map
 *   tex[3] #464ac094                    (no file)   -> map
 *   tex[4] #08a111e3                    (no file)   -> map
 *   tex[5] #5895bced                    (no file)   -> map
 *   tex[6] #0942573b                    (no file)   -> map
 *   tex[7] #d09c054d                    (no file)   -> map
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
export const loopmaterial: MaterialFactory = {
  name: "loopmaterial.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4, map5, map6] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
