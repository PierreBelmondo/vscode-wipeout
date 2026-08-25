import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/cf_icetunnel.rcsmaterial
 *
 *   tex[0] Texture1                     fresnelgradient.gtf   -> map
 *   tex[1] icenormal                    and_ice_norm.gtf   -> normalMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] snow1                        and_snow4alpha.gtf   -> map
 *   tex[4] #f1d875a1                    and_snow_ice_transition.gtf   -> map
 *   tex[5] snownorm1                    cf_ice2_norm.gtf   -> unused
 *   tex[6] #244cd369                    (no file)   -> map
 *   tex[7] #ef8869cd                    (no file)   -> map
 *   tex[8] #591c1bc2                    (no file)   -> map
 *   tex[9] #4042b6e6                    (no file)   -> map
 *   tex[10] #54d8a0ff                    (no file)   -> map
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
export const cf_icetunnel: MaterialFactory = {
  name: "cf_icetunnel.rcsmaterial",
  minTextures: 1,
  maxTextures: 11,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap, map1, map2, _unused5, map3, map4, map5, map6, map7] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
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
