import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/glass_texture_wrecked.rcsmaterial
 *
 * Cracked canopy glass. Real slots: tex[0] Texture1 (egx_glasswrecked.gtf);
 * the lightmap slot is empty. Same shape as glass_texture, but the crack
 * texture carries its own alpha, so keep alpha blending on.
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const glass_texture_wrecked: MaterialFactory = {
  name: "glass_texture_wrecked.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
      opacity: 0.7,
      specular: new THREE.Color(0x888888),
      shininess: 90,
      depthWrite: false,
    });
  },
};
