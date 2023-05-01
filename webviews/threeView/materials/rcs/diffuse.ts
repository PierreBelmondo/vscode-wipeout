import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
data/environments/01_vineta_k/materials/diffuse.rcsmaterial
data/environments/01_vineta_k/materials_dlc/diffuse.rcsmaterial
data/environments/02_track/materials/diffuse.rcsmaterial
data/environments/02_track/materials_dlc/diffuse.rcsmaterial
data/environments/05_ubermall/materials/diffuse.rcsmaterial
data/environments/05_ubermall/materials_dlc/diffuse.rcsmaterial
data/environments/12_sol_2/materials/diffuse.rcsmaterial
data/environments/12_sol_2/materials_dlc/diffuse.rcsmaterial
data/materials/ships/diffuse.rcsmaterial

{ id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
{ id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
{ id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }

data/environments/amphiseum/materials/diffuse.rcsmaterial
data/environments/amphiseum/materials_reversed/diffuse.rcsmaterial
data/environments/modesto_heights/materials/diffuse.rcsmaterial
data/environments/modesto_heights/materials_reversed/diffuse.rcsmaterial

{ id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
{ id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
{ id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
{ id: 648525413, name: '_unknown', align: 18, type: 35, offset: 14 }

data/environments/tech_de_ra/materials/diffuse.rcsmaterial
data/environments/tech_de_ra/materials_reversed/diffuse.rcsmaterial

{ id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
{ id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
{ id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
{ id: 447706673, name: '_unknown', align: 18, type: 68, offset: 14 }
*/
export const diffuse: MaterialFactory = {
  name: "diffuse.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
    });
  },
};
