import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/mageffect08_floor.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_floor_cs.gtf   -> map
 *   tex[1] #1202d8df                    mag_emiss_talons.gtf   -> map
 *   tex[2] Normal                       ds_floor_n_rh.gtf   -> normalMap
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> unused
 *   tex[4] lightmap                     ile_mesh_combine_tracksurface_02-lmap.gtf, ile_mesh_combine_tracksurface_05-lmap.gtf, ile_mesh_combine_tracksurface_01-lmap.gtf   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #370a63cb                    (no file)   -> map
 *   tex[7] #81e0e773                    (no file)   -> map
 *   tex[8] #220cf0e6                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the shader takes the engine's `time` uniform and modulates the
 * emissive term with it, so the glow pulses (see _animated.ts).
 */
export const mageffect08_floor: MaterialFactory = {
  name: "mageffect08_floor.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, normalMap, _unused3, lightMap, _unused5, map2, map3, map4] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
