import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/glassalpha.rcsmaterial
 *
 *   tex[0] DiffuseTexture               glass_darksmoke_r.gtf, mr_blueglass_a.gtf, j_tower_glass_r.gtf   -> map
 *   tex[1] #fc52b822                    j_towerwinhexmap_n.gtf, mr_blueglass_n.gtf, j_windowsnormalmap.gtf   -> normalMap
 *   tex[2] #dda05929                    j_tower_glass_ref.gtf, and_verticalemissive.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
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
export const glassalpha: MaterialFactory = {
  name: "glassalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
