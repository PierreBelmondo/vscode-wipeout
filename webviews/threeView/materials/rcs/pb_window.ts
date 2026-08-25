import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/pb_window.rcsmaterial
 *
 *   tex[0] DiffuseTexture               pb_glassnoframes_d.gtf   -> map
 *   tex[1] #739a786e                    pb_glassnoframes_n.gtf   -> normalMap
 *   tex[2] #c9d39be6                    pb_glassnoframes_r.gtf   -> map
 *   tex[3] #20c3e476                    pb_glassnoframes_s.gtf   -> specularMap
 *   tex[4] lightmap                     ile_mesh_combine13-lmap.gtf, ile_mesh_combine18-lmap.gtf, ile_mesh_combine14-lmap.gtf   -> lightMap
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
export const pb_window: MaterialFactory = {
  name: "pb_window.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, map1, specularMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
