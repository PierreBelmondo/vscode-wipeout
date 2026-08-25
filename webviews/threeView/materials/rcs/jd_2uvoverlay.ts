import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/jd_2uvoverlay.rcsmaterial
 *
 *   tex[0] #499f4be9                    jd_sebenco_conctower_02.gtf, jd_sebenco_damwall_01.gtf, jd_sebenco_blueedge_01.gtf   -> map
 *   tex[1] #67981e49                    jd_sebenco_snowfade_03.gtf, jd_sebenco_damwall_03.gtf, jd_sebenco_damwall_04.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine13-lmap.gtf, ile_mesh_combine14-lmap.gtf, ile_mesh_combine29-lmap.gtf   -> lightMap
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
export const jd_2uvoverlay: MaterialFactory = {
  name: "jd_2uvoverlay.rcsmaterial",
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
