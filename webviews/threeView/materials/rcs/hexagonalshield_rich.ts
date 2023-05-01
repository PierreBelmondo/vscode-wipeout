import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/hexagonalshield_rich.rcsmaterial

  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 18, type: 35, offset: 10 },
  { id: 1955845200, name: 'VertexColour1', align: 18, type: 68, offset: 14 }
*/
export const hexagonalshield_rich: MaterialFactory = {
  name: "hexagonalshield_rich.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      emissive: 0x8080ff,
      emissiveIntensity: 0.5,
      emissiveMap: textures[0],
      side: THREE.DoubleSide,
      //map: textures[0],
      transparent: true,
      opacity: 0.8,
    });
  },
};