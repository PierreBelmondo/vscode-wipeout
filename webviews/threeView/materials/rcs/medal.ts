import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const medal: MaterialFactory = {
  name: "medal.rcsmaterial",
  textures: 0,
  make: (_textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      metalness: 1,
      roughness: 0.5,
    });
  },
};