import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/adverts/hologram_strip_spec.rcsmaterial
 *
 *   tex[0] #9bfd890c                    tunnel_fx_facingramp.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #7611a2d8                    (no file)   -> map
 *   tex[3] #ef18f362                    (no file)   -> map
 *   tex[4] #981fc3f4                    (no file)   -> map
 *   tex[5] #067b5657                    (no file)   -> map
 *   tex[6] Emissive                     (no file)   -> emissiveMap
 *   tex[7] #8943367f                    (no file)   -> map
 *   tex[8] #70b09325                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const hologram_strip_spec: MaterialFactory = {
  name: "hologram_strip_spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4, emissiveMap, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
