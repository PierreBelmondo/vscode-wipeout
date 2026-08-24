import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { ShieldMaterial } from "./_animated";

/**
 * data/materials/ships/hexagonalshield_rich.rcsmaterial
 *
 *   tex[0] DiffuseTexture  shieldhexagonal_alpha.gtf
 *
 * The ship's hexagonal shield. Its fragment program samples the one texture
 * twice and multiplies the results, with the second lookup scrolled by `time`:
 *
 *     MOVR R0.y, f[TEX0].w          ; V
 *     MOVR R0.x, f[TEX1].w          ; U
 *     TEXR H2.w, R0.zwzz, TEX0      ; static sample
 *     MADR R0.z, R1.w, 3.0, R0.y    ; V' = time * rate * 3 + V
 *     TEXR H0.xyz, R0.zwzz, TEX0    ; scrolled sample
 *     MULH H0.w, H0, H1             ; the two alphas multiplied
 *
 * so a hex pattern slides over a static copy of itself and the interference
 * makes the shield shimmer. `ShieldColour` tints the result and
 * `globalAlphaScaler` fades the whole thing as the shield depletes.
 *
 * Permutation: Static[1], RigidBody[27] of 52 — the lit, Ambient, no-shadow,
 *   no-spot point of the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: `ShieldColour` and `globalAlphaScaler` are per-draw uniforms the engine
 *   drives from the shield's state; the colour here is the default blue.
 */
export const hexagonalshield_rich: MaterialFactory = {
  name: "hexagonalshield_rich.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new ShieldMaterial(
      {
        side: THREE.DoubleSide,
        emissive: new THREE.Color(0x8080ff),
        emissiveIntensity: 0.5,
        emissiveMap: textures[0],
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      },
      textures[0],
    );
  },
};
