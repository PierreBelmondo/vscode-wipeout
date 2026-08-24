import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/outersurround01.rcsmaterial
 *
 *   tex[0] Texture1                     bluehorizontal.gtf, outerroad.gtf, outerroadsurroundbridge.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] Colour                       (no file)   -> unused
 *   tex[3] #7611a2d8                    (no file)   -> map
 *   tex[4] Spec                         (no file)   -> specularMap
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
export const outersurround01: MaterialFactory = {
  name: "outersurround01.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, _unused2, map1, specularMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
