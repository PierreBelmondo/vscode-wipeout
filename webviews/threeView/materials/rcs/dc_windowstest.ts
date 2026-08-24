import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/dc_windowstest.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_windowshexdiffuse.gtf, dc_windowsdiffuse.gtf   -> map
 *   tex[1] #739a786e                    dc_windowshexnormalmap.gtf, dc_windowsnormalmap.gtf   -> map
 *   tex[2] #8365b1f3                    dc_skybuildings.gtf   -> map
 *   tex[3] #c7b782c3                    dc_gradient_rainbow.gtf   -> map
 *   tex[4] lightmap                     ile_mesh_combine_track02_02-lmap.gtf   -> lightMap
 *   tex[5] #5e5b1937                    (no file)   -> map
 *   tex[6] #370a63cb                    (no file)   -> map
 *   tex[7] #81e0e773                    (no file)   -> map
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
export const dc_windowstest: MaterialFactory = {
  name: "dc_windowstest.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, map3, lightMap, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
