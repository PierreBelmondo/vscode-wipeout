import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const lambert: MaterialFactory = {
  name: "lambert.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      map: textures[0]
    });
  },
};
