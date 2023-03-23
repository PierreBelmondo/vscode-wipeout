import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const diffuse: MaterialFactory = {
  name: "diffuse.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
    });
  },
};
