import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const diffuse_normal_specular_emmissive_alpha: MaterialFactory = {
  name: "diffuse_normal_specular_emmissive_alpha.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      normalMap: textures[1],
      metalness: 0.9,
    });
  },
};
