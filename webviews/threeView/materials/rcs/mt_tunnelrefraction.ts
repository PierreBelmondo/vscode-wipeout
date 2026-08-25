import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/mt_tunnelrefraction.rcsmaterial
 *
 *   tex[0] DiffuseTexture               mt_tunnelhex_d.gtf   -> map
 *   tex[1] #41d572a2                    mt_tunnelhex_n.gtf   -> normalMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #78575769                    (no file)   -> map
 *   tex[4] #3dd66fff                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * This is the underwater tunnel, and it is genuinely refractive: the material
 * binds `screenSpaceRefractionTex` (#88a0df95) along with a `distortion`
 * uniform and a `refractProject` matrix, and the fragment program unpacks the
 * normal map (`MADR R2.zw, R0.wywy, {2, -1}` — the usual 2n-1) to offset a
 * screen-space lookup. In other words it draws whatever is behind it, warped.
 *
 * The viewer has no screen-space buffer to sample, so `screenSpaceRefractionTex`
 * is deliberately unslotted in _channels.ts. MeshPhysicalMaterial's
 * `transmission` is the closest honest stand-in: it too renders what is behind
 * the surface and refracts it through the normal map, just via Three's own
 * transmission pass rather than the engine's. Rendering this opaque — as this
 * factory used to — turned the tunnel into a black wall instead of a window
 * onto the underwater scene.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: `distortion` ships no value, so the refraction strength here is a
 *   viewer convention rather than the engine's own.
 */
export const mt_tunnelrefraction: MaterialFactory = {
  name: "mt_tunnelrefraction.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, normalMap, lightMap] = textures;
    const material = new THREE.MeshPhysicalMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      // See through to the scene behind, refracted by the normal map.
      transmission: 0.9,
      ior: 1.33,
      roughness: 0.1,
      metalness: 0.0,
    });
    // r149 exposes `thickness` on the instance but not in the constructor's
    // parameter type, so it is set here rather than above.
    material.thickness = 0.5;
    return material;
  },
};
