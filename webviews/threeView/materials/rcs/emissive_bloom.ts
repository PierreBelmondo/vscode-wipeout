import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/emissive_bloom.rcsmaterial
 * data/environments/01_vineta_k/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/02_track/materials/emissive_bloom.rcsmaterial
 * data/environments/02_track/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/03_track/materials/emissive_bloom.rcsmaterial
 * data/environments/03_track/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/04_chenghou_project/materials/emissive_bloom.rcsmaterial
 * data/environments/04_chenghou_project/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/05_ubermall/materials/emissive_bloom.rcsmaterial
 * data/environments/05_ubermall/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/12_sol_2/materials/emissive_bloom.rcsmaterial
 * data/environments/12_sol_2/materials_dlc/emissive_bloom.rcsmaterial
 * data/environments/amphiseum/materials/emissive_bloom.rcsmaterial
 * data/environments/amphiseum/materials_reversed/emissive_bloom.rcsmaterial
 * data/environments/talons_junction/materials/emissive_bloom.rcsmaterial
 * data/environments/talons_junction/materials_reversed/emissive_bloom.rcsmaterial
 * data/environments/tech_de_ra/materials/emissive_bloom.rcsmaterial
 * data/environments/tech_de_ra/materials_reversed/emissive_bloom.rcsmaterial
 * data/materials/ships/emissive_bloom.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
 *
 * Permutation: RigidBody[0] of 15 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 *
 * Animated: the shader takes the engine's `time` uniform and modulates the
 * emissive term with it, so the glow pulses (see _animated.ts).
 */
export const emissive_bloom: MaterialFactory = {
  name: "emissive_bloom.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    textures[0].repeat.set(20, 20);
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
      map: textures[0],
    });
  },
};