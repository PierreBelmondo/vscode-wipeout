import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/tech_de_ra/materials/tech_de_ra_diffuse_spec.rcsmaterial
 *
 *   tex[0] #67b75191                    solar_panel_frame.gtf, bluehexagon_02_colour_spec.gtf, grandstand_02.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_05-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf   -> lightMap
 *   tex[2] #05fec07d                    (no file)   -> map
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
export const tech_de_ra_diffuse_spec: MaterialFactory = {
  name: "tech_de_ra_diffuse_spec.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
