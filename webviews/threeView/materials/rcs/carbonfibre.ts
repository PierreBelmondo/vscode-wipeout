import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/carbonfibre.rcsmaterial

  { id: 3117619978, name: 'position', align: 22, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 22, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 22, type: 68, offset: 10 },
  { id: 1955845200, name: 'VertexColour1', align: 22, type: 68, offset: 14 },
  { id: 1114772732, name: 'Uv1', align: 22, type: 35, offset: 18 }
*/
export const carbonfibre: MaterialFactory = {
  name: "carbonfibre.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    textures[0].repeat.set(4, 4);
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x101010,
      specular: 0xffffff,
      specularMap: textures[0],
      normalMap: textures[0],
      shininess: 90,
    });
  },
};
