import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/dc_diffusetextureemissiveinalpha.rcsmaterial
 *
 *   tex[0] #8b995f49                    dc_concretelights_b.gtf, dc_concretelights.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine2-lmap.gtf, ile_mesh_combine5-lmap.gtf, ile_mesh_combine17-lmap.gtf   -> lightMap
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
export const dc_diffusetextureemissiveinalpha: MaterialFactory = {
  name: "dc_diffusetextureemissiveinalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
