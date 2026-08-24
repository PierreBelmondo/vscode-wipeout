import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/tunnel_fx_noalpha_mult.rcsmaterial
 *
 *   tex[0] DiffuseTexture               tunnel_fx_diffuse.gtf   -> map
 *   tex[1] #b1f2a176                    tunnel_fx_emissive.gtf   -> emissiveMap
 *   tex[2] #20c3e476                    tunnel_fx_spec.gtf   -> specularMap
 *   tex[3] #994bbcf1                    tunnel_fx_facingramp.gtf   -> map
 *   tex[4] lightmap                     ile_mesh_combine_track01_05-lmap.gtf, ile_mesh_combine_track03_05-lmap.gtf   -> lightMap
 *   tex[5] #1178b9df                    (no file)   -> map
 *   tex[6] #901d9fa8                    (no file)   -> map
 *   tex[7] #2924e4ad                    (no file)   -> map
 *   tex[8] #da67aa34                    (no file)   -> map
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
export const tunnel_fx_noalpha_mult: MaterialFactory = {
  name: "tunnel_fx_noalpha_mult.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, specularMap, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
