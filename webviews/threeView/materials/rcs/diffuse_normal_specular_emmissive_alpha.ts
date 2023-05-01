import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/new_mode_pads/detonator_pad/materials/diffuse_normal_specular_emmissive_alpha.rcsmaterial
  data/new_mode_pads/zone_battle_pad/materials/diffuse_normal_specular_emmissive_alpha.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 18, type: 68, offset: 10 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 14 }
*/
export const diffuse_normal_specular_emmissive_alpha: MaterialFactory = {
  name: "diffuse_normal_specular_emmissive_alpha.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      normalMap: textures[1],
      metalness: 0.9,
    });
  },
};
