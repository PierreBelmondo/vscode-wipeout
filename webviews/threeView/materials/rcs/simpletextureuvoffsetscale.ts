import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/billboards/simpletextureuvoffsetscale.rcsmaterial
 *
 * Billboard advert with a scrolling/scaled UV set. Real slots:
 * tex[0] diffuseTexture. uvOffset and uvScale are rgba constants patched
 * at bind time (they default to offset 0,0 / scale 1,1 here), and the
 * lightmap slot is empty.
 *
 * Permutation: Static[0], RigidBody[1] of 2 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const simpletextureuvoffsetscale: MaterialFactory = {
  name: "simpletextureuvoffsetscale.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    const map = textures[0];
    if (map) map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
    });
  },
};
