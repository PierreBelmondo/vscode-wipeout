import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/pb_diffalphaspecnormal.rcsmaterial
 *
 *   tex[0] #6e1426b8                    ds_pbmetal_cs.gtf, jd_chenghou_basicpanel_4.gtf, jd_chenghou_metalsine_01.gtf   -> map
 *   tex[1] Texture1                     pb_whitepanel__normal_jd.gtf, jd_chenghou_basicpanel_4_normal.gtf, jd_chenghou_metalsine_01_normal.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine18-lmap.gtf, ile_mesh_combine-lmap.gtf, ile_mesh_combine3-lmap.gtf   -> lightMap
 *   tex[3] #7611a2d8                    (no file)   -> map
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
export const pb_diffalphaspecnormal: MaterialFactory = {
  name: "pb_diffalphaspecnormal.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
