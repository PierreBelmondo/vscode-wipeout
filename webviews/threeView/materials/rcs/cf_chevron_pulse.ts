import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/cf_chevron_pulse.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_floorchevron_sc.gtf, ds_wallchevron_sc.gtf   -> map
 *   tex[1] #1202d8df                    ds_floorchevron_emask.gtf, ds_wallchevron_emask.gtf   -> map
 *   tex[2] Normal                       ds_floorchevron_n.gtf, ds_wallchevron_n.gtf   -> normalMap
 *   tex[3] Wave                         ds_wave_c.gtf   -> unused
 *   tex[4] lightmap                     ile_mesh_combine-lmap.gtf, ile_mesh_combine1-lmap.gtf, ile_mesh_combine2-lmap.gtf   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #220cf0e6                    (no file)   -> map
 *   tex[7] #a6f5352f                    (no file)   -> map
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
export const cf_chevron_pulse: MaterialFactory = {
  name: "cf_chevron_pulse.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, normalMap, _unused3, lightMap, _unused5, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
