import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/diffuse_normal_specular_emmissive.rcsmaterial
 *
 * The track surface. All 22 `Track_Surface_New:wohdtrack_*Shape` nodes in
 * 01_vineta_k use this material, and nothing else does the road — without it
 * the track itself is the one thing missing from the scene.
 *
 *   tex[0] Texture1  ds_sfline_trench_cs.gtf | ds_rail_cs.gtf
 *                    "_cs" = colour + specular (specular in alpha)
 *   tex[1] Texture2  ds_sfline_trench_ne.gtf | ds_rail_ne.gtf
 *                    "_ne" = normal + emissive (emissive in alpha)
 *   tex[2] lightmap  lmaps/*-lmap.gtf — a real file here
 *   Constant1        (0.000, 0.271, 0.656) — the blue trench glow
 *
 * The `_cs`/`_ne` packing is why this needs both maps: alpha of tex[0] is gloss
 * and alpha of tex[1] is the emissive mask, so neither can be used as a cutout.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts), of 70. The others are TODO.
 */
export const diffuse_normal_specular_emmissive: MaterialFactory = {
  name: "diffuse_normal_specular_emmissive.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [colourSpec, normalEmissive, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(colourSpec ? { map: colourSpec } : {}),
      ...(colourSpec ? { specularMap: colourSpec } : {}),
      ...(normalEmissive ? { normalMap: normalEmissive } : {}),
      ...(normalEmissive ? { emissiveMap: normalEmissive } : {}),
      emissive: new THREE.Color(0x0045a7),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x777777),
      shininess: 55,
    });
  },
};
