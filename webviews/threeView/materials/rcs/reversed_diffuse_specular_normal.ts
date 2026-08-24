import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/reversed_diffuse_specular_normal.rcsmaterial
 *
 *   tex[0] Texture1                     ds_wall_sc.gtf, ds_floorplain_cs.gtf   -> map
 *   tex[1] Texture2                     ds_wall_n.gtf, ds_floorplain_n.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine-lmap.gtf, ile_mesh_combine1-lmap.gtf, ile_mesh_combine2-lmap.gtf   -> lightMap
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
export const reversed_diffuse_specular_normal: MaterialFactory = {
  name: "reversed_diffuse_specular_normal.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
