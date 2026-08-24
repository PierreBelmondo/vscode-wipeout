import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/mt_diffuse_glow_specular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               m_colourhexv10_da.gtf, m_colourhexv11_da.gtf, m_colourhexv04_da.gtf   -> map
 *   tex[1] #20c3e476                    m_colourhexv10_da.gtf, m_colourhexv11_da.gtf, m_colourhexv09_d.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
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
export const mt_diffuse_glow_specular: MaterialFactory = {
  name: "mt_diffuse_glow_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
