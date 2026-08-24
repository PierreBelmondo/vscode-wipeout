import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/diffuse_specular_fresnel.rcsmaterial
 *
 *   tex[0] #148f7216                    mt_fresnel01.gtf   -> map
 *   tex[1] Texture1                     mt_catmetal03_ds.gtf, mt_catmetal01_ds.gtf, mt_catmetal04_ds.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine19-lmap.gtf   -> lightMap
 *   tex[3] #d83c448c                    (no file)   -> map
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
export const diffuse_specular_fresnel: MaterialFactory = {
  name: "diffuse_specular_fresnel.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
