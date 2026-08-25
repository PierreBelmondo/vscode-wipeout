import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/dc_diffusenormalspecular.rcsmaterial
 *
 *   tex[0] #1224ad8c                    dc_pentindent_diffuse.gtf, dc_trackunderside_diffuse.gtf, dc_insetright_diffuse.gtf   -> map
 *   tex[1] #739a786e                    dc_pentindent_normalmap.gtf, dc_trackunderside_normalmap.gtf, dc_insetright_normalmap.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine15-lmap.gtf, ile_mesh_combine4-lmap.gtf, ile_mesh_combine5-lmap.gtf   -> lightMap
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
export const dc_diffusenormalspecular: MaterialFactory = {
  name: "dc_diffusenormalspecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
