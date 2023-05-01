import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
data/materials/ships/diffuse_vcol.rcsmaterial

{ id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
{ id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
{ id: 1955845200, name: 'VertexColour1', align: 18, type: 68, offset: 10 },
{ id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 14 }
*/
export const diffuse_vcol: MaterialFactory = {
  name: "diffuse_vcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      map: textures[0],
    });
  },
};
