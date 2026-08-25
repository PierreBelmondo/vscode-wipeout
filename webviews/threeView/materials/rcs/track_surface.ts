import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/track_surface.rcsmaterial
 *
 *   tex[0] DiffuseTexture               track_floor_diffuse.gtf, track_floor_diffuse_modesto.gtf, ds_pit_box_cs.gtf   -> map
 *   tex[1] #b1f2a176                    track_floor_emissive.gtf, ds_floor_n_rh.gtf, ds_pit_box_n.gtf   -> normalMap
 *   tex[2] #739a786e                    ds_floor01_n.gtf, ile_mesh_combine_tracksurface_01-lmap.gtf, ile_mesh_combine_tracksurface_02-lmap.gtf   -> unused
 *   tex[3] lightmap                     ile_mesh_combine_tracksurface_02-lmap.gtf, ile_mesh_combine_tracksurface_03-lmap.gtf, ile_mesh_combine_tracksurface_04-lmap.gtf   -> lightMap
 *   tex[4] #370a63cb                    (no file)   -> map
 *   tex[5] #81e0e773                    (no file)   -> map
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
export const track_surface: MaterialFactory = {
  name: "track_surface.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, _unused2, lightMap, map1, map2] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
