import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/10_sebenco_climb/materials/track_coloured_specular.rcsmaterial
 *
 *   tex[0] Diffuse                      ds_solarsurface_c.gtf, ds_solarwall_c.gtf   -> map
 *   tex[1] Normal                       ds_solarsurface_n.gtf, ds_solarwall_n.gtf   -> normalMap
 *   tex[2] Specular                     ds_solarsurface_s.gtf, ds_solarwall_s.gtf   -> specularMap
 *   tex[3] lightmap                     ile_mesh_combine37-lmap.gtf, ile_mesh_combine38-lmap.gtf, ile_mesh_combine39-lmap.gtf   -> lightMap
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
export const track_coloured_specular: MaterialFactory = {
  name: "track_coloured_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, specularMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(specularMap ? { specularMap: specularMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
