import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/01_normal_diffuse_specularonalpha.rcsmaterial
 *
 *   tex[0] Texture1                     ds_wall01_cs.gtf, ds_pit_chain_cs.gtf   -> map
 *   tex[1] Texture2                     ds_wall01_rh_n.gtf, ds_pit_chain_n.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine_tracksurface_01-lmap.gtf, ile_mesh_combine_tracksurface_02-lmap.gtf, ile_mesh_combine_tracksurface_03-lmap.gtf   -> lightMap
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
export const m_01_normal_diffuse_specularonalpha: MaterialFactory = {
  name: "01_normal_diffuse_specularonalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
