import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/dn_diffuse_specular_emiss.rcsmaterial
 *
 *   tex[0] #20c3e476                    mar_col_rim3_s.gtf, pb_under_s.gtf, mar_grey_tilewins_spec.gtf   -> map
 *   tex[1] #6f9e6faf                    mar_col_rim3.gtf, pb_under_de.gtf, mar_grey_tilewins_glow.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine10-lmap.gtf, ile_mesh_combine11-lmap.gtf, ile_mesh_combine12-lmap.gtf   -> lightMap
 *   tex[3] #8f3d0540                    (no file)   -> map
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
export const dn_diffuse_specular_emiss: MaterialFactory = {
  name: "dn_diffuse_specular_emiss.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
