import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const billboarddiffuse: MaterialFactory = {
  name: "billboarddiffuse.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
    });
  },
};
