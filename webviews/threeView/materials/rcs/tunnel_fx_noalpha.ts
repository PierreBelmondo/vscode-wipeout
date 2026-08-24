import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/tunnel_fx_noalpha.rcsmaterial
 *
 *   tex[0] DiffuseTexture               tunnel_fx_diffuse.gtf, tunnel_fx_lights_diffuse.gtf, tunnel_02_posts.gtf   -> map
 *   tex[1] #b1f2a176                    tunnel_fx_emissive.gtf, tunnel_02_posts_ems.gtf   -> emissiveMap
 *   tex[2] #20c3e476                    tunnel_fx_spec.gtf, tunnel_fx_lights_spec.gtf, tunnel_02_posts.gtf   -> specularMap
 *   tex[3] #994bbcf1                    blue_metal_facing_ramp.gtf, tunnel_fx_facingramp.gtf   -> map
 *   tex[4] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_04-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf   -> lightMap
 *   tex[5] #901d9fa8                    (no file)   -> map
 *   tex[6] #2924e4ad                    (no file)   -> map
 *   tex[7] #da67aa34                    (no file)   -> map
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
export const tunnel_fx_noalpha: MaterialFactory = {
  name: "tunnel_fx_noalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, specularMap, map1, lightMap, map2, map3, map4] = textures;
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
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
