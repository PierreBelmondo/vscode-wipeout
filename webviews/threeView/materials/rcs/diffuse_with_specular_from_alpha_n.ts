import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/diffuse_with_specular_from_alpha_n.rcsmaterial
 *
 * Non-vertex-colour sibling of diffuse_with_specular_from_alpha_n_vcol.
 * Real slots: tex[0] Diffuse_Texture, tex[1] Normal_Map. The lightmap is
 * empty; the two trailing rgba constants carry SpecScale.
 * Specular strength rides in the diffuse texture's alpha channel.
 *
 * Permutation: RigidBody[0] of 15 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const diffuse_with_specular_from_alpha_n: MaterialFactory = {
  name: "diffuse_with_specular_from_alpha_n.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      normalMap: textures[1],
      specularMap: textures[0],
      specular: new THREE.Color(0xffffff),
      shininess: 78,
    });
  },
};
