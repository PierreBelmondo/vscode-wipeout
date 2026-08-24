import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/and_waterfall.rcsmaterial
 *
 * Binds and_bubbles.gtf four times over (tex[0..3], one of them named
 * `emissive`) — the same art sampled with different UV rates to build up a
 * churn. Only the first is used here; the layered version is TODO along with
 * the multi-UV scroll in _water.ts.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const and_waterfall: MaterialFactory = {
  name: "and_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const bubbles = textures[0];
    return new WaterMaterial(
      {
        side: THREE.DoubleSide,
        ...(bubbles ? { map: bubbles } : {}),
        ...(bubbles ? { emissiveMap: bubbles } : {}),
        emissive: new THREE.Color(0x223344),
        color: new THREE.Color(0xcce4ee),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      },
      0.02,
      -0.28
    );
  },
};
