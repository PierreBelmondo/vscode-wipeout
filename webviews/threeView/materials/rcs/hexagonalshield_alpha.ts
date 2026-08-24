import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/hexagonalshield_alpha.rcsmaterial
 *
 * Shield bubble, alpha-blended variant of hexagonalshield_rich.
 * Real slots: tex[0] DiffuseTexture (shieldhexagonal_alpha.gtf),
 * tex[1] cf_plasma.gtf. The lightmap is empty; ShieldColour is an rgba
 * constant that tints the effect at bind time.
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const hexagonalshield_alpha: MaterialFactory = {
  name: "hexagonalshield_alpha.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      alphaMap: textures[1],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  },
};
