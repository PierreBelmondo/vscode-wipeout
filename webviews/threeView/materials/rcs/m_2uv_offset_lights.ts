import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/2uv_offset_lights.rcsmaterial
 *
 *   tex[0] DiffuseTexture               under_strut.gtf   -> map
 *   tex[1] #98e2964c                    under_strut_glow.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #e8bcd7f5                    (no file)   -> map
 *   tex[4] #1471be04                    (no file)   -> map
 *   tex[5] #7afa31cf                    (no file)   -> map
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
export const m_2uv_offset_lights: MaterialFactory = {
  name: "2uv_offset_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
