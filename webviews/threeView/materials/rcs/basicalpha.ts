import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/basicalpha.rcsmaterial
  data/fe/flyers/materials/basicalpha.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
*/
export const basicalpha: MaterialFactory = {
  name: "basicalpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
    });
  },
};
