import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/mt_diffuse_glow_specular_01.rcsmaterial
 *
 *   tex[0] #a8262b61                    mt_barrier03_g.gtf, m_colourhexv09_d.gtf   -> map
 *   tex[1] DiffuseTexture               m_barrier01_ds.gtf, m_colourhexv01_da.gtf, m_colourhexv08_da.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine23-lmap.gtf   -> lightMap
 *   tex[3] #2d7c53b5                    (no file)   -> map
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
export const mt_diffuse_glow_specular_01: MaterialFactory = {
  name: "mt_diffuse_glow_specular_01.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
