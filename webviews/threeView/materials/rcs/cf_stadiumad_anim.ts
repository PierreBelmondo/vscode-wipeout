import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/cf_stadiumad_anim.rcsmaterial
 *
 *   tex[0] #e8092692                    and_ossego.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine3-lmap.gtf, ile_mesh_combine4-lmap.gtf   -> lightMap
 *   tex[2] #e056c26f                    tv_glow.gtf   -> emissiveMap
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] #ef18f362                    (no file)   -> map
 *   tex[5] #bc029299                    (no file)   -> map
 *   tex[6] #7afa31cf                    (no file)   -> map
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
export const cf_stadiumad_anim: MaterialFactory = {
  name: "cf_stadiumad_anim.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, emissiveMap, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
