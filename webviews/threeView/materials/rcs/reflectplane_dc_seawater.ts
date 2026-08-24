import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/03_track/materials/reflectplane_dc_seawater.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_waternormalmap.gtf   -> map
 *   tex[1] #06a77e50                    dc_waternormalmap.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine25-lmap.gtf, ile_mesh_combine20-lmap.gtf, ile_mesh_combine26-lmap.gtf   -> lightMap
 *   tex[3] #4d60d566                    (no file)   -> map
 *   tex[4] #5e5b1937                    (no file)   -> map
 *   tex[5] #370a63cb                    (no file)   -> map
 *   tex[6] #81e0e773                    (no file)   -> map
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
 * Animated: the shader takes the engine's `time` uniform and offsets the
 * sample coordinate with it, so the texture channels scroll (see _animated.ts).
 */
export const reflectplane_dc_seawater: MaterialFactory = {
  name: "reflectplane_dc_seawater.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
