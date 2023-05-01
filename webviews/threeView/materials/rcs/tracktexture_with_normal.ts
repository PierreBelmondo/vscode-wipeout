import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/zone_1/materials/tracktexture_with_normal.rcsmaterial
  data/environments/zone_2/materials/tracktexture_with_normal.rcsmaterial
  data/environments/zone_3/materials/tracktexture_with_normal.rcsmaterial
  data/environments/zone_4/materials/tracktexture_with_normal.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 34, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 34, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 34, type: 66, offset: 10 },
  { id: 1114772732, name: 'Uv1', align: 34, type: 34, offset: 26 }
*/
export const tracktexture_with_normal: MaterialFactory = {
  name: "tracktexture_with_normal.rcsmaterial",
  textures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
      //map: textures[0],
      //specularMap: textures[0],
      normalMap: textures[1],
      vertexColors: true,
    });
  },
};