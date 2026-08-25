import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/diffuse.rcsmaterial
 * data/environments/01_vineta_k/materials_dlc/diffuse.rcsmaterial
 * data/environments/02_track/materials/diffuse.rcsmaterial
 * data/environments/02_track/materials_dlc/diffuse.rcsmaterial
 * data/environments/05_ubermall/materials/diffuse.rcsmaterial
 * data/environments/05_ubermall/materials_dlc/diffuse.rcsmaterial
 * data/environments/12_sol_2/materials/diffuse.rcsmaterial
 * data/environments/12_sol_2/materials_dlc/diffuse.rcsmaterial
 * data/materials/ships/diffuse.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
 *
 * data/environments/amphiseum/materials/diffuse.rcsmaterial
 * data/environments/amphiseum/materials_reversed/diffuse.rcsmaterial
 * data/environments/modesto_heights/materials/diffuse.rcsmaterial
 * data/environments/modesto_heights/materials_reversed/diffuse.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
 * { id: 648525413, name: '_unknown', align: 18, type: 35, offset: 14 }
 *
 * data/environments/tech_de_ra/materials/diffuse.rcsmaterial
 * data/environments/tech_de_ra/materials_reversed/diffuse.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
 * { id: 447706673, name: '_unknown', align: 18, type: 68, offset: 14 }
 *
 * Permutation: Static[0], StaticQuake[35] of 70 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const diffuse: MaterialFactory = {
  name: "diffuse.rcsmaterial",
  minTextures: 1,
  // Half of this material's uses bind a second texture — a `*-lmap.gtf` — that
  // maxTextures: 1 both warned about and threw away, so those meshes rendered
  // with no baked lighting at all.
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
    });
  },
};
