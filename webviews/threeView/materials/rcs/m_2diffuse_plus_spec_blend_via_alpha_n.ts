import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/2diffuse_plus_spec_blend_via_alpha_n.rcsmaterial
 *
 *   tex[0] #ea78fd4f                    and_grass_rock_blend.gtf   -> map
 *   tex[1] Texture1                     jay_rock2.gtf   -> map
 *   tex[2] Texture2                     and_grass_spec.gtf   -> specularMap
 *   tex[3] Texture3                     rock_normal.gtf   -> normalMap
 *   tex[4] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine16-lmap.gtf, ile_mesh_combine15-lmap.gtf   -> lightMap
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
export const m_2diffuse_plus_spec_blend_via_alpha_n: MaterialFactory = {
  name: "2diffuse_plus_spec_blend_via_alpha_n.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, specularMap, normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
