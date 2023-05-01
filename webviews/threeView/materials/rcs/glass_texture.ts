import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/01_vineta_k/materials/glass_texture.rcsmaterial
  data/environments/01_vineta_k/materials_dlc/glass_texture.rcsmaterial
  data/environments/02_track/materials/glass_texture.rcsmaterial
  data/environments/02_track/materials_dlc/glass_texture.rcsmaterial
  data/environments/03_track/materials/glass_texture.rcsmaterial
  data/environments/03_track/materials_dlc/glass_texture.rcsmaterial
  data/environments/04_chenghou_project/materials/glass_texture.rcsmaterial
  data/environments/04_chenghou_project/materials_dlc/glass_texture.rcsmaterial
  data/environments/05_ubermall/materials/glass_texture.rcsmaterial
  data/environments/05_ubermall/materials_dlc/glass_texture.rcsmaterial
  data/environments/12_sol_2/materials/glass_texture.rcsmaterial
  data/environments/12_sol_2/materials_dlc/glass_texture.rcsmaterial
  data/environments/amphiseum/materials/glass_texture.rcsmaterial
  data/environments/amphiseum/materials_reversed/glass_texture.rcsmaterial
  data/environments/modesto_heights/materials/glass_texture.rcsmaterial
  data/environments/modesto_heights/materials_reversed/glass_texture.rcsmaterial
  data/materials/ships/glass_texture.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
*/
export const glass_texture: MaterialFactory = {
  name: "glass_texture.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x101010,
      specular: 0xffffff,
      transparent: true,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      map: textures[0],
    });
  },
};
