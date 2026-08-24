import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/15_anulpha_pass/materials/cf_centre_plasma_pulse.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_central_cs.gtf   -> map
 *   tex[1] #e4eeaa66                    cf_central_n_m.gtf   -> map
 *   tex[2] Wave                         cf_wave_c.gtf   -> unused
 *   tex[3] lightmap                     ile_mesh_combine4-lmap.gtf, ile_mesh_combine1-lmap.gtf, ile_mesh_combine3-lmap.gtf   -> lightMap
 *   tex[4] #220cf0e6                    (no file)   -> map
 *   tex[5] #a6f5352f                    (no file)   -> map
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
export const cf_centre_plasma_pulse: MaterialFactory = {
  name: "cf_centre_plasma_pulse.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, _unused2, lightMap, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
