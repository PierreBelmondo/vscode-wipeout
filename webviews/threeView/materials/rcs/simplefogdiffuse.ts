import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/simplefogdiffuse.rcsmaterial
 *
 *   tex[0] Texture1                     block7.gtf, block1_128.gtf, mr_whitepanelblue.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #fe7f3ef4                    (no file)   -> map
 *   tex[3] #19158085                    (no file)   -> map
 *   tex[4] #c45093a3                    (no file)   -> map
 *   tex[5] #74df0ab9                    (no file)   -> map
 *   tex[6] #bf3290fb                    (no file)   -> map
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
export const simplefogdiffuse: MaterialFactory = {
  name: "simplefogdiffuse.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
