import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/jd_alphaspecular.rcsmaterial
 *
 *   tex[0] Texture1                     mar_glasstube.gtf, jd_sebenco_window_01.gtf, jd_sebenco_grill_02.gtf   -> map
 *   tex[1] Texture2                     mar_glasstube.gtf, jd_sebenco_windowspec_01.gtf, jd_sebenco_grill_02_speculoar.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine13-lmap.gtf, ile_mesh_combine8-lmap.gtf, ile_mesh_combine7-lmap.gtf   -> lightMap
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
export const jd_alphaspecular: MaterialFactory = {
  name: "jd_alphaspecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
