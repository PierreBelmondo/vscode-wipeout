import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/windowsdiffusespecular_nonemissive_customr.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_windowshexdiffuse.gtf, j_windowsdiffuse.gtf   -> map
 *   tex[1] #8365b1f3                    j_sky.gtf, j_sky4.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #5e5b1937                    (no file)   -> map
 *   tex[4] #370a63cb                    (no file)   -> map
 *   tex[5] #81e0e773                    (no file)   -> map
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
export const windowsdiffusespecular_nonemissive_customr: MaterialFactory = {
  name: "windowsdiffusespecular_nonemissive_customr.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
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
