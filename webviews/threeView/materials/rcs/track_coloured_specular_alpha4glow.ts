import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/track_coloured_specular_alpha4glow.rcsmaterial
 *
 *   tex[0] #48f37f5a                    ds_solarwall_n.gtf   -> map
 *   tex[1] Specular                     ds_solarwall_s.gtf   -> specularMap
 *   tex[2] Texture1                     ds_solarwall_c_withglow.gtf   -> map
 *   tex[3] lightmap                     ile_mesh_combine37-lmap.gtf, ile_mesh_combine38-lmap.gtf, ile_mesh_combine36-lmap.gtf   -> lightMap
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
export const track_coloured_specular_alpha4glow: MaterialFactory = {
  name: "track_coloured_specular_alpha4glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, specularMap, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
