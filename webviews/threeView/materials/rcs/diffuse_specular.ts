import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/01_vineta_k/materials/diffuse_specular.rcsmaterial
  data/environments/01_vineta_k/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/02_track/materials/diffuse_specular.rcsmaterial
  data/environments/02_track/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/05_ubermall/materials/diffuse_specular.rcsmaterial
  data/environments/05_ubermall/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/12_sol_2/materials/diffuse_specular.rcsmaterial
  data/environments/12_sol_2/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/tech_de_ra/materials/diffuse_specular.rcsmaterial
  data/environments/tech_de_ra/materials_reversed/diffuse_specular.rcsmaterial

  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
  { id: 648525413, name: '_unknown', align: 18, type: 35, offset: 14 }

  data/environments/03_track/materials/diffuse_specular.rcsmaterial
  data/environments/03_track/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/04_chenghou_project/materials/diffuse_specular.rcsmaterial
  data/environments/04_chenghou_project/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/10_sebenco_climb/materials/diffuse_specular.rcsmaterial
  data/environments/10_sebenco_climb/materials_dlc/diffuse_specular.rcsmaterial
  data/environments/15_anulpha_pass/materials/diffuse_specular.rcsmaterial
  data/environments/15_anulpha_pass/materials_dlc/diffuse_specular.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
  { id: 447706673, name: '_unknown', align: 18, type: 68, offset: 14 }
*/
export const diffuse_specular: MaterialFactory = {
  name: "diffuse_specular.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      specularMap: textures[1],
    });
  },
};
