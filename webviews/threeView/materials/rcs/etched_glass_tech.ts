import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/etched_glass_tech.rcsmaterial
 *
 *   tex[0] #94b2b285                    dc_iridescent_gradient.gtf   -> map
 *   tex[1] Texture1                     glass_etched_tech.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_tracksurface_06-lmap.gtf, ile_mesh_combine_tracksurface_07-lmap.gtf   -> lightMap
 *   tex[3] #512f8e65                    (no file)   -> map
 *   tex[4] #5e5b1937                    (no file)   -> map
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
export const etched_glass_tech: MaterialFactory = {
  name: "etched_glass_tech.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
