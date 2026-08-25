import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/dc_constantglow.rcsmaterial
 *
 *   tex[0] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine16-lmap.gtf, ile_mesh_combine22-lmap.gtf   -> lightMap
 *   tex[1] #4d60d566                    (no file)   -> map
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
export const dc_constantglow: MaterialFactory = {
  name: "dc_constantglow.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [lightMap, map] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map ? { map: map } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
