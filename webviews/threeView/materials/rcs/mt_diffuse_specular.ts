import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/mt_diffuse_specular.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              m_metalstripv01_d.gtf, m_metalpanelv01_d.gtf, m_metalpanelv07_d.gtf   -> map
 *   tex[1] Specular_Texture             m_metalstripv01_s.gtf, m_metalpanelv01_s.gtf, m_metalpanelv07_s.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine8-lmap.gtf, ile_mesh_combine10-lmap.gtf, ile_mesh_combine9-lmap.gtf   -> lightMap
 *   tex[3] #2fae3d80                    (no file)   -> map
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
export const mt_diffuse_specular: MaterialFactory = {
  name: "mt_diffuse_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
