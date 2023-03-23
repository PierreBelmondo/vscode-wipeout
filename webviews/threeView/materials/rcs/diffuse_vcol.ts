import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const diffuse_vcol: MaterialFactory = {
  name: "diffuse_vcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      map: textures[0],
    });
  },
};
