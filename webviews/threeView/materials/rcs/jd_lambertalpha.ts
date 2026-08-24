import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/04_chenghou_project/materials/jd_lambertalpha.rcsmaterial
 *
 *   tex[0] Texture1                     jd_sebenco_grill_02.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine9-lmap.gtf, ile_mesh_combine10-lmap.gtf, ile_mesh_combine20-lmap.gtf   -> lightMap
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
export const jd_lambertalpha: MaterialFactory = {
  name: "jd_lambertalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
