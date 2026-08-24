import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/solar_iridescence_reflect.rcsmaterial
 *
 *   tex[0] #67b75191                    solar_panel_01.gtf   -> map
 *   tex[1] #739a786e                    solar_panel_01_normal.gtf   -> normalMap
 *   tex[2] Texture1                     solar_iridescence.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #1031494b                    (no file)   -> map
 *   tex[5] #c4ea9e73                    (no file)   -> map
 *   tex[6] #ac9c715c                    (no file)   -> map
 *   tex[7] #05fec07d                    (no file)   -> map
 *   tex[8] #c47baf36                    (no file)   -> map
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
export const solar_iridescence_reflect: MaterialFactory = {
  name: "solar_iridescence_reflect.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, map1, lightMap, map2, map3, map4, map5, map6] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
