import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/pb_diffusealpha4spec.rcsmaterial
 *
 *   tex[0] #6e1426b8                    dn_pannel_01.gtf, pb_metalpanblu_ds.gtf, pb_metalpanbiege_ds.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine10-lmap.gtf, ile_mesh_combine13-lmap.gtf, ile_mesh_combine18-lmap.gtf   -> lightMap
 *   tex[2] #7611a2d8                    (no file)   -> map
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
export const pb_diffusealpha4spec: MaterialFactory = {
  name: "pb_diffusealpha4spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
