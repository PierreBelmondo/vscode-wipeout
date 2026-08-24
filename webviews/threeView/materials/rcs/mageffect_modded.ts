import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/04_chenghou_project/materials/mageffect_modded.rcsmaterial
 *
 *   tex[0] #28e981a4                    jd_chenghou_grilleanim_01.gtf, mar_archcells.gtf   -> map
 *   tex[1] #1202d8df                    jd_chenghou_grilleanim_02.gtf, mar_archmask.gtf   -> map
 *   tex[2] Wave                         jd_chenghou_grilleanim_03.gtf, ds_wave_c.gtf   -> unused
 *   tex[3] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine1-lmap.gtf   -> lightMap
 *   tex[4] Colour                       (no file)   -> unused
 *   tex[5] #220cf0e6                    (no file)   -> map
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
export const mageffect_modded: MaterialFactory = {
  name: "mageffect_modded.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, _unused2, lightMap, _unused4, map2] = textures;
    return new PulsingMaterial({
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
