import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/tunnel_fx_glass.rcsmaterial
 *
 *   tex[0] #eedee991                    tunnel_fx_alpha.gtf   -> map
 *   tex[1] DiffuseTexture               tunnel_fx_diffuse.gtf   -> map
 *   tex[2] Emissive                     tunnel_fx_emissive.gtf   -> emissiveMap
 *   tex[3] #173fbce2                    lightstrip_emissive.gtf   -> unused
 *   tex[4] #20c3e476                    tunnel_fx_spec.gtf   -> specularMap
 *   tex[5] #994bbcf1                    tunnel_fx_facingramp.gtf   -> map
 *   tex[6] lightmap                     (no file)   -> lightMap
 *   tex[7] #901d9fa8                    (no file)   -> map
 *   tex[8] #2924e4ad                    (no file)   -> map
 *   tex[9] #da67aa34                    (no file)   -> map
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
export const tunnel_fx_glass: MaterialFactory = {
  name: "tunnel_fx_glass.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, emissiveMap, _unused3, specularMap, map2, lightMap, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
