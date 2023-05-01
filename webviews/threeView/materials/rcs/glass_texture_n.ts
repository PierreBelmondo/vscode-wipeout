import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/glass_texture_n.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 18, type: 68, offset: 10 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 14 }
*/
export const glass_texture_n: MaterialFactory = {
  name: "glass_texture_n.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      specular: 0xffffff,
      transparent: true,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      map: textures[0],
      normalMap: textures[1],
    });
  },
};
