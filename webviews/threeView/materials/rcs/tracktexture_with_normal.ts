import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

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