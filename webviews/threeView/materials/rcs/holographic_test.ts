import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/holographic_test.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 3682288966, name: 'Uv2', align: 18, type: 35, offset: 14 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
  { id: 451929380, name: '_unknown', align: 18, type: 67, offset: 10 }
*/
export const holographic_test: MaterialFactory = {
  name: "holographic_test.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      side: THREE.FrontSide,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      map: textures[2],
      emissive: 0x0000FF,
      emissiveMap: textures[0],
      emissiveIntensity: 2.0,
    });
  },
};