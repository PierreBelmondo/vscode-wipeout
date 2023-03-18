import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const constantmaterial_vertalpha: MaterialFactory = {
  name: "constantmaterial_vertalpha.rcsmaterial",
  textures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
      alphaMap: textures[0],
      transparent: true,
    });
  },
};