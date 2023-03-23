import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const glass_texture_n: MaterialFactory = {
  name: "glass_texture_n.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x000000,
      specular: 0xffffff,
      transparent: true,
      opacity: 0.5,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      normalMap: textures[0],
    });
  },
};
