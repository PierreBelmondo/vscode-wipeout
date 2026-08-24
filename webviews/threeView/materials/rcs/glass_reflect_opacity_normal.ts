import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/glass_reflect_opacity_normal.rcsmaterial
 *
 *   tex[0] Texture1                     jd_basegreywin_02.gtf, ad_windows_blue.gtf, jd_ash_window1.gtf   -> map
 *   tex[1] Texture2                     jd_basegreywin_02_n.gtf, ad_windows_blue_n.gtf, jd_ash_window1_n.gtf   -> normalMap
 *   tex[2] lightmap                     ile_mesh_combine11-lmap.gtf, ile_mesh_combine12-lmap.gtf, ile_mesh_combine13-lmap.gtf   -> lightMap
 *   tex[3] lightmap                     ile_mesh_combine13-lmap.gtf, ile_mesh_combine14-lmap.gtf   -> unused
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
export const glass_reflect_opacity_normal: MaterialFactory = {
  name: "glass_reflect_opacity_normal.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap, _unused3] = textures;
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
