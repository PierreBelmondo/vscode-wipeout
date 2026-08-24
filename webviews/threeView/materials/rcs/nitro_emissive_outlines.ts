import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/nitro_emissive_outlines.rcsmaterial
 *
 * Ship outline glow. Binds no texture file at all — only an empty lightmap
 * slot and a "Colour" rgba constant, so make() receives an empty array.
 *
 * The lit permutations compute exp(-x^2) over f[TEX0].w:
 *
 * MULR R0.x, -R0, R0                 ; -x*x
 * MULR R0.x, R0, 1.44269             ; * log2(e)
 * EX2R_sat R0.w, R0                  ; exp2 -> exp(-x^2)
 * MADR H0.xyz, <Colour>, R0.w, ...   ; scale the tint by it
 *
 * i.e. a gaussian distance falloff tinting a flat emissive colour. The
 * literals read as 0 here because the engine patches those constant slots
 * from "Colour" at bind time. Rendered as an additive rim glow.
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const nitro_emissive_outlines: MaterialFactory = {
  name: "nitro_emissive_outlines.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: () => {
    return new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  },
};
