import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const diffuse_specular: MaterialFactory = {
  name: "diffuse_specular.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      specularMap: textures[1],
    });
  },
};
