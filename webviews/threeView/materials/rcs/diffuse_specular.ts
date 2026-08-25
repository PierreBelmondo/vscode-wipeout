import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/diffuse_specular.rcsmaterial
 * data/environments/01_vineta_k/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/02_track/materials/diffuse_specular.rcsmaterial
 * data/environments/02_track/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/05_ubermall/materials/diffuse_specular.rcsmaterial
 * data/environments/05_ubermall/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/12_sol_2/materials/diffuse_specular.rcsmaterial
 * data/environments/12_sol_2/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/tech_de_ra/materials/diffuse_specular.rcsmaterial
 * data/environments/tech_de_ra/materials_reversed/diffuse_specular.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
 * { id: 648525413, name: '_unknown', align: 18, type: 35, offset: 14 }
 *
 * data/environments/03_track/materials/diffuse_specular.rcsmaterial
 * data/environments/03_track/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/04_chenghou_project/materials/diffuse_specular.rcsmaterial
 * data/environments/04_chenghou_project/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/10_sebenco_climb/materials/diffuse_specular.rcsmaterial
 * data/environments/10_sebenco_climb/materials_dlc/diffuse_specular.rcsmaterial
 * data/environments/15_anulpha_pass/materials/diffuse_specular.rcsmaterial
 * data/environments/15_anulpha_pass/materials_dlc/diffuse_specular.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
 * { id: 447706673, name: '_unknown', align: 18, type: 68, offset: 14 }
 *
 * Despite the name there is no separate specular sampler: the material binds
 * only `Texture1` (#3bdc0403) and `lightmap` (#37b5db58). The specular lives in
 * `Texture1`'s ALPHA -- the diffuse maps are named `*_cs.gtf`, colour+specular
 * -- so the same texture feeds both slots.
 *
 * The second slot is the lightmap and is genuinely empty on many meshes: of the
 * 363 uses across the shipped tracks, 80 bind one texture, 273 two and 10
 * three. minTextures was 2, so those 80 logged a spurious "wrong number of
 * textures" warning on every load.
 *
 * Permutation: Static[0], StaticQuake[35] of 70 — the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts). The others are TODO.
 */
export const diffuse_specular: MaterialFactory = {
  name: "diffuse_specular.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      // Same texture in both slots: the shader reads its alpha for specular.
      ...(map ? { specularMap: map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
