import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/d_s_n_r_uvflip.rcsmaterial
 *
 *   tex[0] Colour                       ds_surface_plain_c.gtf, ds_surface_leadin_c.gtf, ds_surface_chevron_c.gtf   -> unused
 *   tex[1] #68a741d2                    ds_surface_plain_sr.gtf, ds_surface_leadin_sr.gtf, ds_surface_chevron_sr.gtf   -> map
 *   tex[2] Normal                       ds_surface_plain_n.gtf, ds_surface_leadin_n.gtf, ds_surface_chevron_n.gtf   -> normalMap
 *   tex[3] lightmap                     ile_mesh_combine22-lmap.gtf, ile_mesh_combine23-lmap.gtf, ile_mesh_combine24-lmap.gtf   -> lightMap
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
export const d_s_n_r_uvflip: MaterialFactory = {
  name: "d_s_n_r_uvflip.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [_unused0, map, normalMap, lightMap] = textures;
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
