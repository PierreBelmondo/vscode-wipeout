import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/d_cs.rcsmaterial
 *
 *   tex[0] Colour                       ds_brushed_c.gtf   -> unused
 *   tex[1] #0780521a                    ds_brushed_s.gtf   -> specularMap
 *   tex[2] lightmap                     ile_mesh_combine27-lmap.gtf, ile_mesh_combine28-lmap.gtf   -> lightMap
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
export const d_cs: MaterialFactory = {
  name: "d_cs.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [_unused0, specularMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
