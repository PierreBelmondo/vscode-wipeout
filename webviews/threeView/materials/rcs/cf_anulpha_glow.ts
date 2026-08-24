import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/cf_anulpha_glow.rcsmaterial
 *
 *   tex[0] Texture1                     mar_cellular_lamps_blue.gtf, mar_cellular_tile_blue.gtf, mar_cellular_tile.gtf   -> map
 *   tex[1] Texture2                     under_strut_glow.gtf, cf_greygrad.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine-lmap.gtf, ile_mesh_combine3-lmap.gtf   -> lightMap
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
export const cf_anulpha_glow: MaterialFactory = {
  name: "cf_anulpha_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
