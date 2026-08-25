import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/diffusetextureemissivetexture.rcsmaterial
 *
 *   tex[0] DiffuseTexture               pb_stadbox_de.gtf, dc_windowsnighttime.gtf, dc_lights_diffuse.gtf   -> map
 *   tex[1] #b1f2a176                    pb_stadbox_de.gtf, dc_windowsnighttime_emissive.gtf, dc_lights_emissive.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_04-lmap.gtf   -> lightMap
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
export const diffusetextureemissivetexture: MaterialFactory = {
  name: "diffusetextureemissivetexture.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
