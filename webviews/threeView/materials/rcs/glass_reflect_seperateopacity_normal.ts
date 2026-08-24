import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/glass_reflect_seperateopacity_normal.rcsmaterial
 *
 *   tex[0] #d0502f60                    mar_umallwin1_rgb.gtf, mar_umallwin2_rgb.gtf   -> map
 *   tex[1] Normal                       mar_umallwin1_n.gtf, mar_umallwin2_n.gtf   -> normalMap
 *   tex[2] #42ce0401                    mar_umallwin1_reflect.gtf, mar_umallwin2_reflect.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine6-lmap.gtf, ile_mesh_combine11-lmap.gtf, ile_mesh_combine7-lmap.gtf   -> lightMap
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
export const glass_reflect_seperateopacity_normal: MaterialFactory = {
  name: "glass_reflect_seperateopacity_normal.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
