import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/diffuse_colourtint_seperate_specular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               mr_battleship.gtf, mr_wallconcretelight.gtf, mr_faded_metaldetail.gtf   -> map
 *   tex[1] #20c3e476                    mr_battleship_spec.gtf, dc_basewallconcretespecular.gtf, mr_faded_metaldetail_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section1_02-lmap.gtf, ile_mesh_combine_track_section1_01-lmap.gtf, ile_mesh_combine_track_section1_05-lmap.gtf   -> lightMap
 *   tex[3] #63617681                    (no file)   -> map
 *   tex[4] #370a63cb                    (no file)   -> map
 *   tex[5] #2924e4ad                    (no file)   -> map
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
export const diffuse_colourtint_seperate_specular: MaterialFactory = {
  name: "diffuse_colourtint_seperate_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
