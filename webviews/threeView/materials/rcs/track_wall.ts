import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/track_wall.rcsmaterial
 *
 *   tex[0] #b1f2a176                    track_wall_emissive.gtf, track_wall_diffuse_modesto.gtf, ds_wall_cs.gtf   -> map
 *   tex[1] Texture1                     ds_wall01_cs.gtf, ds_wall_n.gtf   -> normalMap
 *   tex[2] Texture2                     ds_wall01_rh_n.gtf, ile_mesh_combine_tracksurface_01-lmap.gtf, ile_mesh_combine_tracksurface_02-lmap.gtf   -> unused
 *   tex[3] lightmap                     ile_mesh_combine_tracksurface_01-lmap.gtf, ile_mesh_combine_tracksurface_02-lmap.gtf, ile_mesh_combine_tracksurface_03-lmap.gtf   -> lightMap
 *   tex[4] #81e0e773                    (no file)   -> map
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
export const track_wall: MaterialFactory = {
  name: "track_wall.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, _unused2, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
