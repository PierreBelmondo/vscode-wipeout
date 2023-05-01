import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/fe/rank/materials/medal.rcsmaterial
  data/fe/trophies/materials/medal.rcsmaterial

  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 18, type: 68, offset: 10 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 14 }
*/
export const medal: MaterialFactory = {
  name: "medal.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      //normalMap: textures[0],
      metalness: 1.0,
      roughness: 0.5,
    });
  },
};