import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const glass_texture_n: MaterialFactory = {
  name: "glass_texture_n.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      specular: 0xffffff,
      transparent: true,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      map: textures[0],
      normalMap: textures[1],
    });
  },
};
