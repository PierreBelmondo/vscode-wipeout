import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/sebenco_snow_just_snow.rcsmaterial
 *
 *   tex[0] lightmap                     ile_mesh_combine29-lmap.gtf, ile_mesh_combine3-lmap.gtf, ile_mesh_combine30-lmap.gtf   -> lightMap
 *   tex[1] snow                         and_snow3alpha.gtf   -> map
 *   tex[2] snownorm                     and_snow_norm.gtf   -> normalMap
 *   tex[3] #bd4582d3                    (no file)   -> map
 *   tex[4] #9dbd80db                    (no file)   -> map
 *   tex[5] #06f7d6c7                    (no file)   -> map
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
export const sebenco_snow_just_snow: MaterialFactory = {
  name: "sebenco_snow_just_snow.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [lightMap, map, normalMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
