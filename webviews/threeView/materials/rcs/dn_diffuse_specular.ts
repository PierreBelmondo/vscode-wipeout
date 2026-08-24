import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/dn_diffuse_specular.rcsmaterial
 *
 *   tex[0] #832aa927                    j_concrete_wall4.gtf, j_concrete_wall2.gtf, j_office_windows1_ledge.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine18-lmap.gtf, ile_mesh_combine10-lmap.gtf, ile_mesh_combine11-lmap.gtf   -> lightMap
 *   tex[2] #f2ef8543                    j_concrete_wall4_spec.gtf, dn_tile_spec.gtf, j_office_windows1_ledge_s.gtf   -> specularMap
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
export const dn_diffuse_specular: MaterialFactory = {
  name: "dn_diffuse_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, specularMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
