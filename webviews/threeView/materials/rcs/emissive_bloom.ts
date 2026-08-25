import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

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
 *   tex[0] Emissive_Texture (#15b908fd)   -> map
 *
 * { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
 * { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
 *
 * Permutation: idx 53, Backend=Static, Permutation=Ambient -- the lit,
 *   Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts). The
 *   others are TODO. VP block @0x006800, FP block @0x005cc0.
 *
 * Animated: the *vertex* program scrolls the texcoord along V only, from
 * `time` (c[467], hash #906b67ba). U is a plain pass-through of Uv1.x:
 *
 *     MOV o7(TEX0).x, v1.xxxx                      ; U = Uv1.x, untouched
 *     MOV R1.x, c466.xxxx                          ; R1.x = the scroll rate
 *     MAD o7(TEX0).y, R1.xxxx, c467.xxxx, v1.yyyy  ; V' = rate * time + Uv1.y
 *
 * and the fragment program does a single lookup at that coordinate:
 *
 *     MOVH H0.w, {0, 0, 0, Bloom}.x
 *     TEXR H0.xyz, f[TEX0], TEX0                   ; Emissive_Texture at (U, V')
 *
 * so this is the documented ScrollingMaterial pattern -- `time` as a V-axis
 * UV offset feeding one TEXR -- with rateU = 0 because the MOV leaves U alone.
 * c466.x (the unnamed uniform #68292521) is the per-material scroll rate; it
 * is a genuine uniform read, not a literal, so there is no literal scale to
 * apply here and the speed below is the _animated.ts default drift.
 *
 * No fragment instruction reads `time` in any permutation checked, so nothing
 * modulates the emissive term: the earlier PulsingMaterial here came from a
 * misread of the time-consuming MAD and has been corrected. The same
 * time-into-TEX0.y shape appears in the neighbouring StaticQuake permutations
 * (e.g. VP @0x006130: `MAD o7(TEX0).y, R1.xxxx, c464.xxxx, v1.yyyy`), so it is
 * consistent across the permutation matrix rather than a one-off.
 */
export const emissive_bloom: MaterialFactory = {
  name: "emissive_bloom.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    textures[0].repeat.set(20, 20);
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        color: 0xffffff,
        specular: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        map: textures[0],
      },
      0.0,
      0.05,
    );
  },
};
