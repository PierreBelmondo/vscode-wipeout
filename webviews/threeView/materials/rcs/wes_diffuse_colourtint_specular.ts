import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/wes_diffuse_colourtint_specular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               j_grey_concrete_panellines.gtf   -> map
 *   tex[1] #20c3e476                    j_grey_concrete_panellines_spec.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine_track_section5_04-lmap.gtf, ile_mesh_combine_track_section5_05-lmap.gtf   -> lightMap
 *   tex[3] #671a582c                    (no file)   -> map
 *   tex[4] #438ddeff                    (no file)   -> map
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
export const wes_diffuse_colourtint_specular: MaterialFactory = {
  name: "wes_diffuse_colourtint_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
