import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/yellowbarfx.rcsmaterial
 *
 *   tex[0] #52971b53                    scrollbar.gtf   -> map
 *   tex[1] #5b44594b                    window_fx_grad.gtf   -> map
 *   tex[2] #b1600426                    scrollbar.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine_track02_02-lmap.gtf   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #60a433da                    (no file)   -> map
 *   tex[6] #cc6a37c5                    (no file)   -> map
 *   tex[7] #8ba613e1                    (no file)   -> map
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
export const yellowbarfx: MaterialFactory = {
  name: "yellowbarfx.rcsmaterial",
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
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
