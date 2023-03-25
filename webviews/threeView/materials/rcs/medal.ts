import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const medal: MaterialFactory = {
  name: "medal.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      //normalMap: textures[0],
      metalness: 1.0,
      roughness: 0.5,
    });
  },
};