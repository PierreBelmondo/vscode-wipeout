import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/mr_stem.rcsmaterial
 *
 *   tex[0] Texture1                     jd_ubermall_concrete_08.gtf, jd_ubermall_concrete_07.gtf, jd_ubermall_basicmetal_01.gtf   -> map
 *   tex[1] #70ba125d                    stempanels.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine17-lmap.gtf, ile_mesh_combine18-lmap.gtf, ile_mesh_combine1-lmap.gtf   -> lightMap
 *   tex[3] #7611a2d8                    (no file)   -> map
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
export const mr_stem: MaterialFactory = {
  name: "mr_stem.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
