import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const carbonfibre: MaterialFactory = {
  name: "carbonfibre.rcsmaterial",
  textures: 1,
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