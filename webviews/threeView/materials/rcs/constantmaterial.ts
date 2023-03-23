import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const constantmaterial: MaterialFactory = {
  name: "constantmaterial.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
    });
  },
};