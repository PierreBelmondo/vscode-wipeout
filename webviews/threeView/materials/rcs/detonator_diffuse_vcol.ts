import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/detonator_diffuse_vcol.rcsmaterial
 *
 * Detonator-mode ship skin: diffuse texture modulated by vertex colour.
 * Real slots: tex[0] Diffuse_Texture (the lightmap slot is empty).
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const detonator_diffuse_vcol: MaterialFactory = {
  name: "detonator_diffuse_vcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      map: textures[0],
    });
  },
};
