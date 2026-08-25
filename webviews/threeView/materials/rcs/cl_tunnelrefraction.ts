import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/cl_tunnelrefraction.rcsmaterial
 *
 *   tex[0] #41d572a2                    cl_tunnelhex_specv3.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #512f8e65                    (no file)   -> map
 *   tex[3] #78575769                    (no file)   -> map
 *   tex[4] #3dd66fff                    (no file)   -> map
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
export const cl_tunnelrefraction: MaterialFactory = {
  name: "cl_tunnelrefraction.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    // Same refraction bindings as mt_tunnelrefraction — screenSpaceRefractionTex,
    // `distortion` and `refractProject` — so it gets the same treatment: see
    // that factory for why transmission stands in for the engine's
    // screen-space lookup.
    const material = new THREE.MeshPhysicalMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      transmission: 0.9,
      ior: 1.33,
      roughness: 0.1,
      metalness: 0.0,
    });
    material.thickness = 0.5;
    return material;
  },
};
