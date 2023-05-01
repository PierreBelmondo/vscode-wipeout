import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/glass_texture_clamped.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
*/
export const glass_texture_clamped: MaterialFactory = {
  name: "glass_texture_clamped.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
      opacity: 0.95,
    });
  },
};