import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/windowsnormaldiffusespecular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_windowsdiffuse.gtf, dc_windowshexdiffuse.gtf   -> map
 *   tex[1] #739a786e                    dc_windowsnormalmap.gtf, dc_windowshexnormalmap.gtf   -> map
 *   tex[2] #c7b782c3                    dc_gradient_rainbow.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_03-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf   -> lightMap
 *   tex[4] #5e5b1937                    (no file)   -> map
 *   tex[5] #370a63cb                    (no file)   -> map
 *   tex[6] #81e0e773                    (no file)   -> map
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
export const windowsnormaldiffusespecular: MaterialFactory = {
  name: "windowsnormaldiffusespecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
