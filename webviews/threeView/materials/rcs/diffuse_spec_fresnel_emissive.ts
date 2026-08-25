import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/diffuse_spec_fresnel_emissive.rcsmaterial
 *
 *   tex[0] Diffuse_Texture              tunnel_02_posts.gtf   -> map
 *   tex[1] Texture1                     tunnel_fx_facingramp.gtf, blue_metal_facing_ramp.gtf   -> map
 *   tex[2] Texture2                     tunnel_02_posts_ems.gtf   -> emissiveMap
 *   tex[3] lightmap                     ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_07-lmap.gtf, ile_mesh_combine_track01_08-lmap.gtf   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #03e55ee0                    (no file)   -> map
 *   tex[6] #60a433da                    (no file)   -> map
 *   tex[7] #cc6a37c5                    (no file)   -> map
 *   tex[8] #8ba613e1                    (no file)   -> map
 *   tex[9] #4232e459                    (no file)   -> map
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
export const diffuse_spec_fresnel_emissive: MaterialFactory = {
  name: "diffuse_spec_fresnel_emissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
