import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/holographic_projector2.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 3682288966, name: 'Uv2', align: 18, type: 35, offset: 10 },
  { id: 1955845200, name: 'VertexColour1', align: 18, type: 68, offset: 14 }
*/
export const holographic_projector2: MaterialFactory = {
  name: "holographic_projector2.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0x000000,
      emissiveIntensity: 2.0,
      map: textures[0],
      emissiveMap: textures[0],
      transparent: true,
      opacity: 0.75,
    });
  },
};