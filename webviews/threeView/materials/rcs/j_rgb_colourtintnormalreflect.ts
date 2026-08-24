import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/j_rgb_colourtintnormalreflect.rcsmaterial
 *
 *   tex[0] DiffuseTexture               j_glassnoframes_d.gtf   -> map
 *   tex[1] #739a786e                    j_glassnoframes_n.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine7-lmap.gtf, ile_mesh_combine5-lmap.gtf, ile_mesh_combine8-lmap.gtf   -> lightMap
 *   tex[3] #044b91ad                    (no file)   -> map
 *   tex[4] #671a582c                    (no file)   -> map
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
export const j_rgb_colourtintnormalreflect: MaterialFactory = {
  name: "j_rgb_colourtintnormalreflect.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
